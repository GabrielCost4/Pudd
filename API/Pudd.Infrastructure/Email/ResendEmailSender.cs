using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Pudd.Application.Interfaces;

namespace Pudd.Infrastructure.Email;

public class ResendEmailSender(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<ResendEmailSender> logger
) : IEmailSender
{
    private const string ResendApiUrl = "https://api.resend.com/emails";

    public async Task EnviarOtpRecuperacaoAsync(string destinatario, string otp)
    {
        var apiKey = configuration["Resend:ApiKey"];
        var from = configuration["Resend:From"] ?? "Pudd <onboarding@resend.dev>";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("re_SUA_CHAVE"))
        {
            logger.LogWarning("[RESEND DEV] Resend ApiKey não configurada. Logando OTP no console: {Email} -> {Otp}", destinatario, otp);
            return;
        }

        var requestBody = new
        {
            from,
            to = new[] { destinatario },
            subject = $"{otp} é o seu código de recuperação do Pudd",
            html = $"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="margin-bottom: 24px; text-align: center;">
                    <h2 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Recuperação de Conta</h2>
                    <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Você solicitou a redefinição de senha da sua conta no Pudd.</p>
                </div>

                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px dashed #cbd5e1;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Seu código de verificação</p>
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0f172a; display: inline-block;">{otp}</span>
                    <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">Válido por 15 minutos</p>
                </div>

                <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                    Insira este código na tela de recuperação para definir uma nova senha.
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                    Se você não solicitou a alteração da sua senha, pode ignorar este e-mail com segurança.
                </p>
            </div>
            """
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, ResendApiUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = JsonContent.Create(requestBody);

        var response = await httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            logger.LogError("[RESEND ERROR] Falha ao enviar e-mail via Resend: {StatusCode} - {Error}", response.StatusCode, errorContent);
            throw new InvalidOperationException($"Falha no envio de e-mail pelo Resend: {response.StatusCode}");
        }

        logger.LogInformation("[RESEND] E-mail de recuperação enviado com sucesso para {Email}", destinatario);
    }
}
