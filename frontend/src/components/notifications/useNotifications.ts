// src/components/notifications/useNotifications.ts
import { useState, useEffect } from "react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: string;
  read: boolean;
}

export default function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Load existing notifications
  useEffect(() => {
    const saved = localStorage.getItem("notifications");
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  // Save to localStorage
  const save = (list: NotificationItem[]) => {
    setNotifications(list);
    localStorage.setItem("notifications", JSON.stringify(list));
  };

  // Add a new notification
  const pushNotification = (item: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      read: false,
      ...item,
    };

    save([newNotification, ...notifications]);
  };

  // Mark all as read
  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    save(updated);
  };

  // Clear all notifications
  const clearAll = () => {
    save([]);
  };

  return {
    notifications,
    pushNotification,
    markAllRead,
    clearAll,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}
