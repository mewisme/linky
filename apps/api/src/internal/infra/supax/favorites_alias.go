package supax

import fav "linky-api/src/internal/infra/supax/favorites"

type FavoriteRow = fav.Row

type FavoriteWithStatsRow = fav.WithStatsRow

type FavoriteLimitRow = fav.LimitRow

type FavoriteLimitCheck = fav.LimitCheck

var (
	GetFavoritesByUserID           = fav.GetByUserID
	GetFavoritesWithStats          = fav.GetWithStats
	CheckFavoriteExists            = fav.Exists
	CreateFavorite                 = fav.Create
	DeleteFavorite                 = fav.Delete
	GetFavoriteCreationDate        = fav.CreationDate
	CheckDailyFavoriteLimitReached = fav.CheckDailyLimitReached
	IncrementFavoriteLimit         = fav.IncrementLimit
	DecrementFavoriteLimit         = fav.DecrementLimit
)
