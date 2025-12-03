import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  notificationType: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@taskmaster.app');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'TaskMaster CMMS');
    this.baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // In production, integrate with email provider (SendGrid, AWS SES, etc.)
      // For now, log the email details
      const provider = this.configService.get<string>('EMAIL_PROVIDER', 'console');

      switch (provider) {
        case 'sendgrid':
          return this.sendViaSendGrid(options);
        case 'ses':
          return this.sendViaSES(options);
        case 'smtp':
          return this.sendViaSMTP(options);
        default:
          // Console logging for development
          this.logger.log(`Email would be sent:
            To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}
            Subject: ${options.subject}
            Body: ${options.text || 'HTML email'}
          `);
          return true;
      }
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return false;
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<boolean> {
    // Placeholder for SendGrid integration
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
    // await sgMail.send({
    //   to: options.to,
    //   from: { email: this.fromEmail, name: this.fromName },
    //   subject: options.subject,
    //   text: options.text,
    //   html: options.html,
    // });
    this.logger.log('SendGrid email sent (placeholder)');
    return true;
  }

  private async sendViaSES(options: EmailOptions): Promise<boolean> {
    // Placeholder for AWS SES integration
    // const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    // const client = new SESClient({ region: this.configService.get('AWS_REGION') });
    // await client.send(new SendEmailCommand({...}));
    this.logger.log('AWS SES email sent (placeholder)');
    return true;
  }

  private async sendViaSMTP(options: EmailOptions): Promise<boolean> {
    // Placeholder for SMTP integration
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: this.configService.get('SMTP_HOST'),
    //   port: this.configService.get('SMTP_PORT'),
    //   auth: { ... }
    // });
    // await transporter.sendMail({...});
    this.logger.log('SMTP email sent (placeholder)');
    return true;
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    const html = this.generateNotificationEmailHtml(data);
    const text = this.generateNotificationEmailText(data);

    return this.sendEmail({
      to: data.recipientEmail,
      subject: data.title,
      html,
      text,
    });
  }

  private generateNotificationEmailHtml(data: NotificationEmailData): string {
    const actionButton = data.actionUrl
      ? `
        <tr>
          <td style="padding: 20px 0;">
            <a href="${data.actionUrl}"
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              ${data.actionText || 'View Details'}
            </a>
          </td>
        </tr>
      `
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e40af; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">TaskMaster CMMS</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                Hello ${data.recipientName},
              </p>
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                ${data.title}
              </h2>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${data.body}
              </p>
              ${actionButton}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                This is an automated notification from TaskMaster CMMS.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                To manage your notification preferences, visit your
                <a href="${this.baseUrl}/settings" style="color: #3b82f6;">account settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private generateNotificationEmailText(data: NotificationEmailData): string {
    let text = `Hello ${data.recipientName},\n\n`;
    text += `${data.title}\n\n`;
    text += `${data.body}\n\n`;

    if (data.actionUrl) {
      text += `${data.actionText || 'View Details'}: ${data.actionUrl}\n\n`;
    }

    text += `---\n`;
    text += `This is an automated notification from TaskMaster CMMS.\n`;
    text += `To manage your notification preferences, visit: ${this.baseUrl}/settings\n`;

    return text;
  }

  // Template methods for specific notification types
  async sendWorkOrderAssignedEmail(
    recipientEmail: string,
    recipientName: string,
    workOrderNumber: string,
    workOrderTitle: string,
    dueDate?: string,
  ): Promise<boolean> {
    return this.sendNotificationEmail({
      recipientEmail,
      recipientName,
      notificationType: 'work_order_assigned',
      title: `Work Order Assigned: ${workOrderNumber}`,
      body: `You have been assigned to work order "${workOrderTitle}"${dueDate ? ` with a due date of ${dueDate}` : ''}.`,
      actionUrl: `${this.baseUrl}/work-orders/${workOrderNumber}`,
      actionText: 'View Work Order',
    });
  }

  async sendWorkOrderCompletedEmail(
    recipientEmail: string,
    recipientName: string,
    workOrderNumber: string,
    workOrderTitle: string,
    completedBy: string,
  ): Promise<boolean> {
    return this.sendNotificationEmail({
      recipientEmail,
      recipientName,
      notificationType: 'work_order_completed',
      title: `Work Order Completed: ${workOrderNumber}`,
      body: `Work order "${workOrderTitle}" has been completed by ${completedBy}.`,
      actionUrl: `${this.baseUrl}/work-orders/${workOrderNumber}`,
      actionText: 'View Details',
    });
  }

  async sendWorkOrderOverdueEmail(
    recipientEmail: string,
    recipientName: string,
    workOrderNumber: string,
    workOrderTitle: string,
    daysOverdue: number,
  ): Promise<boolean> {
    return this.sendNotificationEmail({
      recipientEmail,
      recipientName,
      notificationType: 'work_order_overdue',
      title: `Overdue Work Order: ${workOrderNumber}`,
      body: `Work order "${workOrderTitle}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Please take action.`,
      actionUrl: `${this.baseUrl}/work-orders/${workOrderNumber}`,
      actionText: 'View Work Order',
    });
  }

  async sendLowInventoryEmail(
    recipientEmail: string,
    recipientName: string,
    itemName: string,
    itemNumber: string,
    currentStock: number,
    reorderPoint: number,
  ): Promise<boolean> {
    return this.sendNotificationEmail({
      recipientEmail,
      recipientName,
      notificationType: 'low_inventory_alert',
      title: `Low Inventory Alert: ${itemName}`,
      body: `Inventory item "${itemName}" (${itemNumber}) has fallen below the reorder point. Current stock: ${currentStock}, Reorder point: ${reorderPoint}.`,
      actionUrl: `${this.baseUrl}/inventory/${itemNumber}`,
      actionText: 'View Inventory Item',
    });
  }

  async sendScheduleDueEmail(
    recipientEmail: string,
    recipientName: string,
    scheduleName: string,
    assetName: string,
    dueDate: string,
  ): Promise<boolean> {
    return this.sendNotificationEmail({
      recipientEmail,
      recipientName,
      notificationType: 'schedule_due',
      title: `Maintenance Due: ${scheduleName}`,
      body: `Scheduled maintenance "${scheduleName}" for asset "${assetName}" is due on ${dueDate}.`,
      actionUrl: `${this.baseUrl}/scheduling`,
      actionText: 'View Schedule',
    });
  }
}
