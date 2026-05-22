package user

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

func ListNotifications(ctx context.Context, userID string, limit, offset int, unreadOnly bool) ([]supax.NotificationRow, error) {
	rows, _, err := supax.GetUserNotifications(ctx, userID, limit, offset, unreadOnly)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return []supax.NotificationRow{}, nil
	}
	return rows, nil
}

func UnreadNotificationCount(ctx context.Context, userID string) (int64, error) {
	return supax.GetUnreadNotificationCount(ctx, userID)
}

func MarkNotificationRead(ctx context.Context, notificationID, userID string) error {
	return supax.MarkNotificationRead(ctx, notificationID, userID)
}

func MarkAllNotificationsRead(ctx context.Context, userID string) error {
	return supax.MarkAllNotificationsRead(ctx, userID)
}
