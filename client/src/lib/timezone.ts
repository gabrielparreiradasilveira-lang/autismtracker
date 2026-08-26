/**
 * Fuso do navegador, no formato que o servidor espera.
 *
 * `getTimezoneOffset()` devolve quantos minutos somar à hora local para
 * chegar em UTC — no Brasil (UTC-3), 180. O servidor usa esse número
 * para agrupar os registros pelo dia real da pessoa: ele roda em UTC no
 * Railway, então sem esse valor tudo que fosse registrado a partir das
 * 21h contaria no dia seguinte.
 *
 * Lido a cada chamada, de propósito: quem viaja ou passa pelo horário de
 * verão muda de fuso sem recarregar a página.
 */
export function fusoDoUsuario() {
  return new Date().getTimezoneOffset();
}
