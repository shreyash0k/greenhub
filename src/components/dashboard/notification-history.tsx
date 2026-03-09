interface NotificationLog {
  id: string
  date: Date | string
  hadContribution: boolean
  emailSent: boolean
  createdAt: Date | string
}

interface Props {
  notifications: NotificationLog[]
}

export function NotificationHistory({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          Recent Activity
        </h3>
        <p className="text-gray-500">
          No notification history yet. Check back after your first scheduled
          reminder.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Recent Activity
      </h3>
      <div className="divide-y divide-gray-100">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  n.hadContribution ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              <span className="text-sm text-gray-700">
                {n.hadContribution ? "Contributed" : "No contribution"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {n.emailSent && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Email sent
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
