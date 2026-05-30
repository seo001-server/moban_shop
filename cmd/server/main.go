package main

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"

	"moban_shop/internal/admin"
	"moban_shop/internal/apiresp"
	"moban_shop/internal/auth"
	"moban_shop/internal/cart"
	"moban_shop/internal/catalog"
	"moban_shop/internal/cms"
	"moban_shop/internal/config"
	"moban_shop/internal/orders"
	dbpkg "moban_shop/internal/database"
	"moban_shop/internal/db"
)

func main() {
	loadDotenv()

	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	if valErr := cfg.Validate(); valErr != nil {
		logger.Error("config", "error", valErr)
		os.Exit(1)
	}

	sqlDB, err := dbpkg.Open(cfg)
	if err != nil {
		logger.Error("database", "error", err)
		os.Exit(1)
	}
	defer func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			logger.Warn("database close", "error", closeErr)
		}
	}()

	q := db.New(sqlDB)
	cms.BootstrapDocs(context.Background(), q, logger)
	catHandler := catalog.New(q)
	authHandler := auth.NewHandler(q, []byte(cfg.JWTSecret), cfg.JWTIssuer, cfg.JWTAccessTTL)
	adminAuth := admin.NewAuthHandler(q, []byte(cfg.JWTAdminSecret), cfg.JWTAdminIssuer, cfg.JWTAdminAccessTTL)
	adminProducts := admin.NewProductsHandler(q)
	adminBusiness := admin.NewBusinessHandler(q)
	adminBusinessSections := admin.NewBusinessSectionsHandler(q)
	adminSiteContent := admin.NewSiteContentHandler(q)
	adminDocs := admin.NewDocsHandler(q)
	adminDashboard := admin.NewDashboardHandler(q)
	adminUsers := admin.NewUsersHandler(q)
	adminOrders := admin.NewOrdersHandler(q)
	adminAuditLogs := admin.NewAuditLogsHandler(q)
	uploadDir := resolveUploadDir()
	adminUploads := admin.NewUploadsHandler(uploadDir)
	ordersHandler := orders.NewHandler(q, sqlDB)
	cartHandler := cart.NewHandler(q)

	e := echo.New()
	e.HideBanner = true
	e.Logger.SetOutput(io.Discard)
	e.Pre(echomiddleware.RemoveTrailingSlash())
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())

	if cfg.AllowOrigins != "" && cfg.AllowOrigins != "*" {
		e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
			AllowOrigins: splitOrigins(cfg.AllowOrigins),
			AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete, http.MethodOptions},
		}))
	} else {
		e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
			AllowOriginFunc: func(string) (bool, error) { return true, nil },
			AllowMethods:    []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete, http.MethodOptions},
		}))
	}

	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		if he, ok := err.(*echo.HTTPError); ok && he.Code >= 500 {
			logger.Error("handler", "error", err, "path", c.Request().URL.Path, "code", he.Code)
		} else if !ok {
			logger.Error("unhandled error", "error", err, "path", c.Request().URL.Path)
		}
		msg := apiresp.ErrorMessage(err)
		if errJSON := apiresp.Fail(c, msg); errJSON != nil {
			logger.Warn("write error JSON", "error", errJSON)
		}
	}

	e.GET("/healthz", func(c echo.Context) error {
		return apiresp.OK(c, map[string]string{"status": "ok"})
	})

	e.GET("/readyz", func(c echo.Context) error {
		ctx, cancel := context.WithTimeout(c.Request().Context(), 3*time.Second)
		defer cancel()
		if _, err := q.Ping(ctx); err != nil {
			return echo.NewHTTPError(http.StatusServiceUnavailable, "数据库未就绪")
		}
		return apiresp.OK(c, map[string]string{"status": "ready"})
	})

	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		logger.Error("uploads dir", "error", err)
		os.Exit(1)
	}
	e.Static("/uploads", uploadDir)

	api := e.Group("/api")
	api.GET("/products", catHandler.ListProducts)
	api.GET("/products/:id", catHandler.GetProductByID)
	api.GET("/business-sections", catHandler.ListBusinessSections)
	api.GET("/business/:slug", catHandler.ListBusinessBySection)
	api.GET("/homepage", catHandler.GetHomepage)
	api.GET("/docs/:slug", catHandler.GetDoc)
	api.POST("/auth/register", authHandler.Register)
	api.POST("/auth/login", authHandler.Login)
	api.GET("/me", authHandler.Me, auth.RequireAuth([]byte(cfg.JWTSecret), cfg.JWTIssuer))

	ordersAuthed := api.Group("", auth.RequireAuth([]byte(cfg.JWTSecret), cfg.JWTIssuer))
	ordersAuthed.POST("/orders", ordersHandler.CreateOrder)
	ordersAuthed.GET("/orders", ordersHandler.ListMyOrders)
	ordersAuthed.GET("/orders/:id", ordersHandler.GetMyOrder)
	ordersAuthed.POST("/orders/:id/pay", ordersHandler.PayOrder)
	ordersAuthed.GET("/cart", cartHandler.List)
	ordersAuthed.POST("/cart/items", cartHandler.AddItem)
	ordersAuthed.PUT("/cart/items/:product_id", cartHandler.SetItemQty)
	ordersAuthed.DELETE("/cart/items/:product_id", cartHandler.DeleteItem)
	ordersAuthed.DELETE("/cart", cartHandler.Clear)
	ordersAuthed.POST("/cart/merge", cartHandler.Merge)

	adminGrp := api.Group("/admin")
	adminGrp.POST("/auth/login", adminAuth.Login)

	adminAuthed := adminGrp.Group("", admin.RequireAdminJWT([]byte(cfg.JWTAdminSecret), cfg.JWTAdminIssuer))
	adminAuthed.GET("/me", adminAuth.Me)
	adminAuthed.PATCH("/me", adminAuth.UpdateMe)
	adminAuthed.POST("/me/password", adminAuth.ChangePassword)
	adminAuthed.GET("/dashboard", adminDashboard.GetDashboard)
	adminAuthed.POST("/uploads/image", adminUploads.UploadImage)
	adminAuthed.GET("/users", adminUsers.ListUsers)
	adminAuthed.GET("/users/:id", adminUsers.GetUser)
	adminAuthed.GET("/users/:id/orders", adminUsers.ListUserOrders)
	adminAuthed.GET("/orders", adminOrders.ListOrders)
	adminAuthed.GET("/orders/:id", adminOrders.GetOrder)
	adminAuthed.PATCH("/orders/:id/status", adminOrders.UpdateOrderStatus)
	adminAuthed.GET("/products", adminProducts.ListProducts)
	adminAuthed.POST("/products", adminProducts.CreateProduct)
	adminAuthed.POST("/products/batch-delete", adminProducts.BatchDeleteProducts)
	adminAuthed.PATCH("/products/:id/visible", adminProducts.SetProductVisible)
	adminAuthed.POST("/products/batch-recommended", adminProducts.BatchSetRecommended)
	adminAuthed.GET("/products/:id", adminProducts.GetProduct)
	adminAuthed.POST("/products/:id/duplicate", adminProducts.DuplicateProduct)
	adminAuthed.PUT("/products/:id", adminProducts.UpdateProduct)
	adminAuthed.DELETE("/products/:id", adminProducts.DeleteProduct)
	adminAuthed.GET("/business", adminBusiness.ListBusiness)
	adminAuthed.POST("/business", adminBusiness.CreateBusiness)
	adminAuthed.GET("/business/:id", adminBusiness.GetBusiness)
	adminAuthed.PUT("/business/:id", adminBusiness.UpdateBusiness)
	adminAuthed.DELETE("/business/:id", adminBusiness.DeleteBusiness)
	adminAuthed.GET("/business-sections", adminBusinessSections.List)
	adminAuthed.GET("/business-sections/:slug", adminBusinessSections.Get)
	adminAuthed.PUT("/business-sections/:slug", adminBusinessSections.Update)
	adminAuthed.GET("/site-content/homepage", adminSiteContent.GetHomepage)
	adminAuthed.PUT("/site-content/homepage", adminSiteContent.UpdateHomepage)
	adminAuthed.PATCH("/site-content/homepage", adminSiteContent.PatchHomepage)
	adminAuthed.GET("/docs", adminDocs.List)
	adminAuthed.GET("/docs/:slug", adminDocs.Get)
	adminAuthed.PUT("/docs/:slug", adminDocs.Update)
	adminAuthed.GET("/audit-logs", adminAuditLogs.List)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		addr := cfg.HTTPAddr
		logger.Info("http listen", "addr", addr)
		if serveErr := e.Start(addr); serveErr != nil && serveErr != http.ErrServerClosed {
			logger.Error("http server stopped", "error", serveErr)
			stop()
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if shutdownErr := e.Shutdown(shutdownCtx); shutdownErr != nil {
		logger.Warn("shutdown", "error", shutdownErr)
		os.Exit(1)
	}
	logger.Info("shutdown complete")
}

// loadDotenv finds the first .env walking up from CWD, then from the executable
// directory (double-clicking cmd/server.exe usually sets CWD to cmd/, which has no .env).
func loadDotenv() {
	// Already-set env wins; godotenv does not override.
	tryDirs := func(start string) {
		for d := start; d != "" && d != filepath.Dir(d); d = filepath.Dir(d) {
			p := filepath.Join(d, ".env")
			if _, err := os.Stat(p); err == nil {
				_ = godotenv.Load(p)
				return
			}
		}
	}
	if wd, err := os.Getwd(); err == nil {
		tryDirs(wd)
	}
	if exe, err := os.Executable(); err == nil {
		tryDirs(filepath.Dir(exe))
	}
}

func splitOrigins(s string) []string {
	if s == "" {
		return nil
	}
	raw := strings.Split(s, ",")
	out := make([]string, 0, len(raw))
	for _, part := range raw {
		t := strings.TrimSpace(part)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func resolveUploadDir() string {
	if v := strings.TrimSpace(os.Getenv("UPLOAD_DIR")); v != "" {
		return v
	}
	if wd, err := os.Getwd(); err == nil {
		return filepath.Join(wd, "uploads")
	}
	return "uploads"
}
