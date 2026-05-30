package admin

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type DashboardHandler struct {
	Q *db.Queries
}

func NewDashboardHandler(q *db.Queries) *DashboardHandler {
	return &DashboardHandler{Q: q}
}

const dashboardTrendDays = 7

type dashboardStatsJSON struct {
	UsersCount         int64 `json:"users_count"`
	TemplatesCount     int64 `json:"templates_count"`
	OrdersCount        int64 `json:"orders_count"`
	OrdersPendingCount int64 `json:"orders_pending_count"`
	OrdersPaidCount    int64 `json:"orders_paid_count"`
	RevenueMinor       int64 `json:"revenue_minor"`
}

type dailyCountJSON struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type trendSummaryJSON struct {
	YesterdayUsers  int64 `json:"yesterday_users"`
	YesterdayOrders int64 `json:"yesterday_orders"`
	TodayUsers      int64 `json:"today_users"`
	TodayOrders     int64 `json:"today_orders"`
}

type topProductSalesJSON struct {
	ProductID    int64  `json:"product_id"`
	ProductTitle string `json:"product_title"`
	SalesQty     int64  `json:"sales_qty"`
}

type dashboardTrendsJSON struct {
	Days        int                   `json:"days"`
	Users       []dailyCountJSON      `json:"users"`
	Orders      []dailyCountJSON      `json:"orders"`
	Summary     trendSummaryJSON      `json:"summary"`
	TopProducts []topProductSalesJSON `json:"top_products"`
}

type dashboardJSON struct {
	Stats  dashboardStatsJSON  `json:"stats"`
	Trends dashboardTrendsJSON `json:"trends"`
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func formatDayKey(t time.Time) string {
	return startOfDay(t).Format("2006-01-02")
}

func buildDailySeries(days int, rows map[string]int64, now time.Time) []dailyCountJSON {
	out := make([]dailyCountJSON, 0, days)
	today := startOfDay(now)
	for i := days - 1; i >= 0; i-- {
		day := today.AddDate(0, 0, -i)
		key := formatDayKey(day)
		out = append(out, dailyCountJSON{
			Date:  key,
			Count: rows[key],
		})
	}
	return out
}

func dailyUsersMap(rows []db.AdminDailyNewUsersRow) map[string]int64 {
	m := make(map[string]int64, len(rows))
	for _, row := range rows {
		m[formatDayKey(row.Day)] = row.Count
	}
	return m
}

func dailyOrdersMap(rows []db.AdminDailyNewOrdersRow) map[string]int64 {
	m := make(map[string]int64, len(rows))
	for _, row := range rows {
		m[formatDayKey(row.Day)] = row.Count
	}
	return m
}

// GetDashboard returns aggregate counts and recent daily trends for the admin home page.
func (h *DashboardHandler) GetDashboard(c echo.Context) error {
	ctx := c.Request().Context()
	now := time.Now()

	usersCount, err := h.Q.AdminCountUsers(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计用户数量失败")
	}
	templatesCount, err := h.Q.AdminCountProducts(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计模板数量失败")
	}
	ordersCount, err := h.Q.AdminCountOrders(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计订单数量失败")
	}
	pendingCount, err := h.Q.AdminCountOrdersByStatus(ctx, "pending")
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计待处理订单失败")
	}
	paidCount, err := h.Q.AdminCountOrdersByStatus(ctx, "paid")
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计已付款订单失败")
	}
	revenueMinor, err := h.Q.AdminSumPaidAmount(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计营收失败")
	}

	usersToday, err := h.Q.AdminCountUsersToday(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计今日用户失败")
	}
	usersYesterday, err := h.Q.AdminCountUsersYesterday(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计昨日用户失败")
	}
	ordersToday, err := h.Q.AdminCountOrdersToday(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计今日订单失败")
	}
	ordersYesterday, err := h.Q.AdminCountOrdersYesterday(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计昨日订单失败")
	}

	userDailyRows, err := h.Q.AdminDailyNewUsers(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取每日新增用户失败")
	}
	orderDailyRows, err := h.Q.AdminDailyNewOrders(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取每日新增订单失败")
	}
	topProductRows, err := h.Q.AdminTopProductSales(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取热销商品失败")
	}
	topProducts := make([]topProductSalesJSON, 0, len(topProductRows))
	for _, row := range topProductRows {
		topProducts = append(topProducts, topProductSalesJSON{
			ProductID:    int64(row.ProductID),
			ProductTitle: row.ProductTitle,
			SalesQty:     row.SalesQty,
		})
	}

	return apiresp.OK(c, dashboardJSON{
		Stats: dashboardStatsJSON{
			UsersCount:         usersCount,
			TemplatesCount:     templatesCount,
			OrdersCount:        ordersCount,
			OrdersPendingCount: pendingCount,
			OrdersPaidCount:    paidCount,
			RevenueMinor:       revenueMinor,
		},
		Trends: dashboardTrendsJSON{
			Days:   dashboardTrendDays,
			Users:  buildDailySeries(dashboardTrendDays, dailyUsersMap(userDailyRows), now),
			Orders: buildDailySeries(dashboardTrendDays, dailyOrdersMap(orderDailyRows), now),
			Summary: trendSummaryJSON{
				YesterdayUsers:  usersYesterday,
				YesterdayOrders: ordersYesterday,
				TodayUsers:      usersToday,
				TodayOrders:     ordersToday,
			},
			TopProducts: topProducts,
		},
	})
}
