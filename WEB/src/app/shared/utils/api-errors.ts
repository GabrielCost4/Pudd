import { HttpErrorResponse } from '@angular/common/http';
import type { ApiProblem } from '../models/api-problem';

export function apiErrors(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) return ['Não foi possível concluir. Tente novamente.'];
  if (error.status === 0)
    return ['Não foi possível conectar à API. Verifique sua conexão e tente novamente.'];
  if (error.status === 429)
    return ['Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.'];
  const problem = error.error as ApiProblem | null;
  const fields =
    problem?.errors && typeof problem.errors === 'object'
      ? Object.values(problem.errors)
          .flat()
          .filter((value): value is string => typeof value === 'string')
      : [];
  if (fields.length) return fields;
  return [
    typeof problem?.title === 'string'
      ? problem.title
      : 'Não foi possível concluir esta ação. Tente novamente.',
  ];
}
