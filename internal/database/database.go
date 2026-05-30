package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"

	"moban_shop/internal/config"
)

// Open configures a MySQL *sql.DB with sane pooling defaults for a small HTTP service.
func Open(cfg config.Config) (*sql.DB, error) {
	if cfg.DatabaseDSN == "" {
		return nil, fmt.Errorf("DATABASE_DSN 未配置")
	}

	mcfg, err := mysql.ParseDSN(cfg.DatabaseDSN)
	if err != nil {
		return nil, fmt.Errorf("解析 DATABASE_DSN 失败: %w", err)
	}
	if !mcfg.ParseTime {
		return nil, fmt.Errorf("DATABASE_DSN 须包含 parseTime=true 以正确映射 TIMESTAMP")
	}

	db, err := sql.Open("mysql", cfg.DatabaseDSN)
	if err != nil {
		return nil, fmt.Errorf("打开数据库连接失败: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if pingErr := db.PingContext(ctx); pingErr != nil {
		_ = db.Close()
		return nil, fmt.Errorf("连接 MySQL 失败: %w", pingErr)
	}

	return db, nil
}
