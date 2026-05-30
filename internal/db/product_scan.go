package db

// scanProductFields returns Scan destinations for the standard product SELECT list.
func scanProductFields(p *Product) []any {
	return []any{
		&p.ID,
		&p.Slug,
		&p.Category,
		&p.Title,
		&p.Description,
		&p.PriceMinor,
		&p.Currency,
		&p.ImageUrl,
		&p.PreviewUrl,
		&p.SortOrder,
		&p.Recommended,
		&p.Visible,
		&p.Downloads,
		&p.Score,
		&p.CreatedAt,
	}
}
