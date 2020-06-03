import { ConfigService } from "./config";
import nodemailer from "nodemailer";

export class EmailService {
  public static async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const smtpConfig = ConfigService.getConfig().smtp;
    const transport = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    },
    {
      from: `${smtpConfig.fromName} <${smtpConfig.fromAddress}>`
    });

    console.log(`Sending email to <${to}> with subject '${subject}'`);

    return transport.sendMail({
      to,
      subject,
      text: body
    }).then(value => {
      console.log(value);
    });
  }
}