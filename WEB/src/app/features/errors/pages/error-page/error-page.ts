import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionStore } from '../../../../core/auth/session.store';
import { BlurReveal } from '../../../../shared/components/blur-reveal/blur-reveal';
import { SpotlightCard } from '../../../../shared/components/spotlight-card/spotlight-card';

@Component({
  selector: 'app-error-page',
  imports: [RouterLink, BlurReveal, SpotlightCard],
  templateUrl: './error-page.html',
  styleUrl: './error-page.css',
})
export class ErrorPage {
  protected readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly notFound = this.route.snapshot.data['notFound'] === true;
  protected readonly forbidden = this.route.snapshot.queryParamMap.get('reason') === 'forbidden';
  protected readonly code = this.notFound ? '404' : this.forbidden ? '403' : '401';
  protected readonly title = this.notFound
    ? 'Essa conversa tomou outro caminho.'
    : this.forbidden
      ? 'Este espaço tem acesso restrito.'
      : 'Vamos nos conectar de novo?';
  protected readonly description = this.notFound
    ? 'A página ou o conteúdo que você procura não está disponível. Pode ter sido removido ou o endereço está incorreto.'
    : this.forbidden
      ? 'Sua conta não tem permissão para acessar este recurso.'
      : 'Sua sessão terminou ou a API recusou o acesso à conta. Entre novamente para continuar.';
}
