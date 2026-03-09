interface Props {
  hasContributed: boolean
  contributionCount: number
  username: string
}

export function ContributionStatus({
  hasContributed,
  contributionCount,
  username,
}: Props) {
  return (
    <div
      className={`rounded-xl p-6 ${
        hasContributed
          ? "bg-green-50 border border-green-200"
          : "bg-amber-50 border border-amber-200"
      }`}
    >
      <div className="flex items-center gap-5">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${
            hasContributed ? "bg-green-500" : "bg-amber-500"
          }`}
        >
          {hasContributed ? (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 8v4m0 4h.01"
              />
            </svg>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {hasContributed
              ? `${contributionCount} contribution${contributionCount !== 1 ? "s" : ""} today`
              : "No contributions yet today"}
          </h2>
          <p className="text-gray-600 mt-1">
            {hasContributed
              ? "Great job keeping your streak alive!"
              : "There's still time to make your mark today."}
          </p>
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:text-green-700 mt-2 inline-block font-medium"
          >
            View your GitHub profile &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}
