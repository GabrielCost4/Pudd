import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionStore } from '../../../../core/auth/session.store';

@Component({
  selector: 'app-error-page',
  imports: [CardModule, ButtonModule, RouterLink],
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
    ? 'Página não encontrada'
    : this.forbidden
      ? 'Acesso restrito'
      : 'Sessão encerrada';

  protected readonly description = this.notFound
    ? 'A página ou o conteúdo que você procura não está disponível. Pode ter sido removido ou o endereço está incorreto.'
    : this.forbidden
      ? 'Sua conta não tem permissão para acessar este recurso.'
      : 'Sua sessão terminou ou a API recusou o acesso à conta. Entre novamente para continuar.';
}
