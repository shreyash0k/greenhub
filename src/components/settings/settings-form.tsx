"use client"

import { useState } from "react"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Sao_Paulo",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
]

interface Props {
  initialTimezone: string
  initialReminderEnabled: boolean
  initialReminderTimes: string[]
}

export function SettingsForm({
  initialTimezone,
  initialReminderEnabled,
  initialReminderTimes,
}: Props) {
  const [timezone, setTimezone] = useState(initialTimezone)
  const [reminderEnabled, setReminderEnabled] = useState(
    initialReminderEnabled
  )
  const [reminderTimes, setReminderTimes] = useState(initialReminderTimes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const allTimezones = TIMEZONES.includes(initialTimezone)
    ? TIMEZONES
    : [initialTimezone, ...TIMEZONES]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, reminderEnabled, reminderTimes }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved!" })
      } else {
        setMessage({ type: "error", text: "Failed to save settings." })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." })
    } finally {
      setSaving(false)
    }
  }

  function addTime() {
    setReminderTimes([...reminderTimes, "21:00"])
  }

  function removeTime(index: number) {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index))
  }

  function updateTime(index: number, value: string) {
    const updated = [...reminderTimes]
    updated[index] = value
    setReminderTimes(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
        >
          {allTimezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={reminderEnabled}
          onClick={() => setReminderEnabled(!reminderEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            reminderEnabled ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
              reminderEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <label className="text-sm font-medium text-gray-700">
          {reminderEnabled ? "Reminders enabled" : "Reminders disabled"}
        </label>
      </div>

      {reminderEnabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminder Times
          </label>
          <div className="space-y-2">
            {reminderTimes.map((time, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(i, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {reminderTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(i)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTime}
            className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            + Add another time
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  )
}
