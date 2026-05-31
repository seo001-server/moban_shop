package orders

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/go-sql-driver/mysql"
)

func isDuplicateKey(err error) bool {
	var me *mysql.MySQLError
	if errors.As(err, &me) {
		return me.Number == 1062
	}
	return false
}

func nullStringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}

func itemHasDownload(paid bool, visible bool, downloadURL sql.NullString) bool {
	if !paid || !visible || !downloadURL.Valid {
		return false
	}
	return strings.TrimSpace(downloadURL.String) != ""
}
