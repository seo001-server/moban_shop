package admin

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/db"
)

const (
	AuditActionLogin                 = "admin.login"
	AuditActionAdminUpdateMe         = "admin.update_me"
	AuditActionAdminChangePassword   = "admin.change_password"
	AuditActionOrderUpdateStatus     = "order.update_status"
	AuditActionProductCreate         = "product.create"
	AuditActionProductUpdate         = "product.update"
	AuditActionProductDuplicate      = "product.duplicate"
	AuditActionProductDelete         = "product.delete"
	AuditActionBusinessCreate        = "business.create"
	AuditActionBusinessUpdate        = "business.update"
	AuditActionBusinessDelete        = "business.delete"
	AuditActionBusinessSectionUpdate = "business_section.update"
	AuditActionDocUpdate             = "doc.update"
	AuditActionSiteContentUpdate     = "site_content.update_homepage"
	AuditResourceAdmin               = "admin"
	AuditResourceOrder               = "order"
	AuditResourceProduct             = "product"
	AuditResourceBusiness            = "business"
	AuditResourceBusinessSection     = "business_section"
	AuditResourceDoc                 = "doc"
	AuditResourceSiteContent         = "site_content"
)

var validAuditActions = map[string]struct{}{
	AuditActionLogin:                 {},
	AuditActionAdminUpdateMe:         {},
	AuditActionAdminChangePassword:   {},
	AuditActionOrderUpdateStatus:     {},
	AuditActionProductCreate:         {},
	AuditActionProductUpdate:         {},
	AuditActionProductDuplicate:      {},
	AuditActionProductDelete:         {},
	AuditActionBusinessCreate:        {},
	AuditActionBusinessUpdate:        {},
	AuditActionBusinessDelete:        {},
	AuditActionBusinessSectionUpdate: {},
	AuditActionDocUpdate:             {},
	AuditActionSiteContentUpdate:     {},
}

var validAuditResources = map[string]struct{}{
	AuditResourceAdmin:           {},
	AuditResourceOrder:           {},
	AuditResourceProduct:         {},
	AuditResourceBusiness:        {},
	AuditResourceBusinessSection: {},
	AuditResourceDoc:             {},
	AuditResourceSiteContent:     {},
}

func ClientIP(c echo.Context) string {
	ip := c.RealIP()
	if ip == "" {
		ip = c.Request().RemoteAddr
	}
	return ip
}

func WriteAuditLog(ctx context.Context, q *db.Queries, adminID uint64, action, resource, resourceID, ip, detail string) {
	detail = strings.TrimSpace(detail)
	if len(detail) > 512 {
		detail = detail[:512]
	}
	_ = q.InsertAdminAuditLog(ctx, db.InsertAdminAuditLogParams{
		AdminID:    adminID,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Detail:     detail,
		Ip:         ip,
	})
}

func auditFromContext(c echo.Context, q *db.Queries, action, resource, resourceID, detail string) {
	adminID, ok := AdminUserID(c)
	if !ok {
		return
	}
	WriteAuditLog(c.Request().Context(), q, adminID, action, resource, resourceID, ClientIP(c), detail)
}

type AuditLogsHandler struct {
	Q *db.Queries
}

func NewAuditLogsHandler(q *db.Queries) *AuditLogsHandler {
	return &AuditLogsHandler{Q: q}
}

type auditLogJSON struct {
	ID            uint64 `json:"id"`
	AdminID       uint64 `json:"admin_id"`
	AdminAccount  string `json:"admin_account"`
	AdminNickname string `json:"admin_nickname"`
	Action        string `json:"action"`
	Resource      string `json:"resource"`
	ResourceID    string `json:"resource_id"`
	Detail        string `json:"detail"`
	IP            string `json:"ip"`
	CreatedAt     string `json:"created_at"`
}

func auditRowToJSON(row db.AdminListAuditLogsPagedRow) auditLogJSON {
	return auditLogJSON{
		ID:            row.ID,
		AdminID:       row.AdminID,
		AdminAccount:  row.AdminAccount,
		AdminNickname: row.AdminNickname,
		Action:        row.Action,
		Resource:      row.Resource,
		ResourceID:    row.ResourceID,
		Detail:        row.Detail,
		IP:            row.Ip,
		CreatedAt:     row.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func parseAuditLogsFilters(c echo.Context) (db.AdminAuditLogsFilterArgs, error) {
	action := strings.TrimSpace(c.QueryParam("action"))
	if action != "" {
		if _, ok := validAuditActions[action]; !ok {
			return db.AdminAuditLogsFilterArgs{}, echo.NewHTTPError(http.StatusBadRequest, "操作类型筛选无效")
		}
	}
	resource := strings.TrimSpace(c.QueryParam("resource"))
	if resource != "" {
		if _, ok := validAuditResources[resource]; !ok {
			return db.AdminAuditLogsFilterArgs{}, echo.NewHTTPError(http.StatusBadRequest, "资源类型筛选无效")
		}
	}
	from, err := parseDateQuery(c.QueryParam("from"))
	if err != nil {
		return db.AdminAuditLogsFilterArgs{}, err
	}
	to, err := parseDateQuery(c.QueryParam("to"))
	if err != nil {
		return db.AdminAuditLogsFilterArgs{}, err
	}
	return db.NewAdminAuditLogsFilterArgs(action, resource, from, to), nil
}

func (h *AuditLogsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	p := ParsePagination(c)
	filters, err := parseAuditLogsFilters(c)
	if err != nil {
		return err
	}
	total, err := h.Q.AdminCountAuditLogsFiltered(ctx, filters)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计审计日志失败")
	}
	rows, err := h.Q.AdminListAuditLogsFilteredPaged(ctx, filters, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取审计日志失败")
	}
	out := make([]auditLogJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, auditRowToJSON(row))
	}
	return writePaginatedJSON(c, out, p, total)
}

func auditResourceIDUint(id uint64) string {
	return strconv.FormatUint(id, 10)
}

func auditDetailStatusChange(from, to string) string {
	return fmt.Sprintf("%s → %s", from, to)
}
