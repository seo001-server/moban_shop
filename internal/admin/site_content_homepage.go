package admin

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

type homepagePatchBody struct {
	Hero          json.RawMessage `json:"hero"`
	CategoryCards json.RawMessage `json:"category_cards"`
	Features      json.RawMessage `json:"features"`
}

func (h *SiteContentHandler) PatchHomepage(c echo.Context) error {
	var patch homepagePatchBody
	if err := c.Bind(&patch); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}

	hasHero := len(patch.Hero) > 0 && string(patch.Hero) != "null"
	hasCards := len(patch.CategoryCards) > 0 && string(patch.CategoryCards) != "null"
	hasFeatures := len(patch.Features) > 0 && string(patch.Features) != "null"
	if !hasHero && !hasCards && !hasFeatures {
		return echo.NewHTTPError(http.StatusBadRequest, "请提供要保存的分区内容")
	}
	if hasHero && !json.Valid(patch.Hero) {
		return echo.NewHTTPError(http.StatusBadRequest, "Hero JSON 格式无效")
	}
	if hasCards && !json.Valid(patch.CategoryCards) {
		return echo.NewHTTPError(http.StatusBadRequest, "分类卡片 JSON 格式无效")
	}
	if hasFeatures && !json.Valid(patch.Features) {
		return echo.NewHTTPError(http.StatusBadRequest, "优势区块 JSON 格式无效")
	}

	ctx := c.Request().Context()
	row, err := h.Q.GetSiteContent(ctx, homepageContentKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "首页配置不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取首页配置失败")
	}

	merged, section, err := mergeHomepageContent(row.ContentJson, patch, hasHero, hasCards, hasFeatures)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.Q.UpsertSiteContent(ctx, homepageContentKey, merged); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存首页配置失败")
	}
	if adminID, ok := AdminUserID(c); ok {
		WriteAuditLog(ctx, h.Q, adminID, AuditActionSiteContentUpdate, AuditResourceSiteContent, homepageContentKey, ClientIP(c), section)
	}
	return h.GetHomepage(c)
}

func mergeHomepageContent(existing []byte, patch homepagePatchBody, hasHero, hasCards, hasFeatures bool) ([]byte, string, error) {
	base := map[string]json.RawMessage{}
	if len(existing) > 0 {
		if err := json.Unmarshal(existing, &base); err != nil {
			return nil, "", errors.New("解析现有首页配置失败")
		}
	}
	sections := make([]string, 0, 3)
	if hasHero {
		base["hero"] = patch.Hero
		sections = append(sections, "hero")
	}
	if hasCards {
		base["category_cards"] = patch.CategoryCards
		sections = append(sections, "category_cards")
	}
	if hasFeatures {
		base["features"] = patch.Features
		sections = append(sections, "features")
	}
	out, err := json.Marshal(base)
	if err != nil {
		return nil, "", errors.New("合并首页配置失败")
	}
	return out, strings.Join(sections, ","), nil
}
