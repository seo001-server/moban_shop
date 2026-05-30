package admin

import (
	"errors"

	"github.com/go-sql-driver/mysql"
)

func isDuplicateKey(err error) bool {
	var me *mysql.MySQLError
	if errors.As(err, &me) {
		return me.Number == 1062
	}
	return false
}

func isForeignKeyConstraint(err error) bool {
	var me *mysql.MySQLError
	if errors.As(err, &me) {
		return me.Number == 1451
	}
	return false
}

const productDeleteBlockedMsg = "该模板已被订单引用，无法删除"

func productDeleteBlocked(err error) bool {
	return isForeignKeyConstraint(err)
}
