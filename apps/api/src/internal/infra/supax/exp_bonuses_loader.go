package supax

import (
	"context"

	"linky-api/src/internal/infra/expbonus"
)

const expBonusesListLimit = 1000

func RefreshExpBonuses(ctx context.Context) error {
	rows, _, err := ListGenericTable(ctx, "exp_bonuses", expBonusesListLimit, 0)
	if err != nil {
		return err
	}
	streak, level := expbonus.ParseRows(rows)
	expbonus.ApplySnapshot(streak, level)
	return nil
}

func init() {
	expbonus.SetReloadFunc(RefreshExpBonuses)
}
