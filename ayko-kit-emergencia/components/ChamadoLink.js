/**
 * Sempre que um número de chamado do Halo for exibido em qualquer tela,
 * usar este componente — transforma em link direto pro portal, abrindo
 * em nova aba (pra não tirar o usuário do sistema).
 *
 * <ChamadoLink numero={r.chamado_halo_id} />
 */
export default function ChamadoLink({ numero, className = "" }) {
  if (!numero) return <span className={className}>—</span>;

  return (
    <a
      href={`https://portal.ayko.tech/ticket?id=${numero}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`text-purple hover:underline ${className}`}
    >
      {numero}
    </a>
  );
}
