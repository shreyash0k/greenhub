import { Resend } from "resend"

let resendClient: Resend | null = null

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendReminder(
  to: string,
  githubUsername: string
): Promise<boolean> {
  try {
    const resend = getResend()
    const fromEmail =
      process.env.EMAIL_FROM || "GreenHub <onboarding@resend.dev>"

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "GitHub Contribution Reminder - Keep Your Streak!",
      html: generateEmailTemplate(githubUsername),
    })

    if (error) throw new Error(error.message)
    return true
  } catch (err) {
    console.error(`Failed to send reminder to ${to}:`, err)
    return false
  }
}

function getAppUrl(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "https://greenhub-eosin.vercel.app"
  )
}

function generateEmailTemplate(githubUsername: string): string {
  const profileUrl = `https://github.com/${githubUsername}`
  const settingsUrl = `${getAppUrl()}/settings`

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #58a6ff; margin: 0 0 15px 0;">Hey ${githubUsername}!</h2>
        <p style="color: #c9d1d9; font-size: 16px; margin-bottom: 15px;">
          You haven't made any GitHub contributions today yet. Don't break your streak!
        </p>
        <p style="color: #8b949e; font-size: 14px; margin-bottom: 25px;">
          Every commit counts towards building your consistency and keeping your contribution graph green.
        </p>
        <div style="text-align: center;">
          <a href="${profileUrl}"
             style="display: inline-block; background: #238636; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            View Your Profile
          </a>
        </div>
      </div>
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>Quick ideas:</strong> Fix a typo, update docs, commit WIP, or work on a side project!
        </p>
      </div>
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #8b949e; font-size: 12px;">
        <p>GreenHub - Your GitHub Contribution Reminder</p>
        <p style="margin-top: 8px;">
          <a href="${settingsUrl}" style="color: #8b949e; text-decoration: underline;">
            Manage reminder preferences or unsubscribe
          </a>
        </p>
      </div>
    </body>
    </html>
  `
}
