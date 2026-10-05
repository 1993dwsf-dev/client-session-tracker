/**
 * Teste de carga básico — sem dependências, usa o fetch nativo do Bun.
 *
 * Uso:
 *   bun scripts/load-test.ts <url> [duracaoSegundos=10] [concorrencia=10]
 *
 * Exemplo:
 *   bun scripts/load-test.ts https://seu-app.exemplo.com/ 15 20
 *
 * CUIDADO: rode apenas contra ambientes que você controla (staging ou a sua
 * própria URL de produção), em horário de baixo tráfego. Não aponte para
 * serviços de terceiros.
 */

const target = process.argv[2];
if (!target) {
  console.error(
    "erro: informe a URL. Ex.: bun scripts/load-test.ts https://app.example.com/ 15 20",
  );
  process.exit(1);
}

const url = new URL(target); // valida a URL antes de começar
const durationSec = Number(process.argv[3] ?? 10);
const concurrency = Number(process.argv[4] ?? 10);

if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 300) {
  console.error("erro: duração deve estar entre 1 e 300 segundos");
  process.exit(1);
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 200) {
  console.error("erro: concorrência deve estar entre 1 e 200");
  process.exit(1);
}

const deadline = Date.now() + durationSec * 1000;
const latencies: number[] = [];
let failures = 0;
let serverErrors = 0;

async function worker() {
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const res = await fetch(url, { redirect: "follow" });
      await res.arrayBuffer(); // drena o corpo para reutilizar a conexão
      if (res.status >= 500) serverErrors += 1;
      else latencies.push(performance.now() - started);
    } catch {
      failures += 1;
    }
  }
}

console.log(
  `[carga] alvo=${url.href} duracao=${durationSec}s concorrencia=${concurrency}`,
);
const startedAt = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedMs = Date.now() - startedAt;

latencies.sort((a, b) => a - b);
const pct = (p: number) =>
  latencies.length === 0
    ? 0
    : Math.round(
        latencies[
          Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))
        ],
      );
const rps = latencies.length / (elapsedMs / 1000);

console.log(
  `[carga] sucesso=${latencies.length} erroServidor5xx=${serverErrors} falhaRede=${failures}`,
);
console.log(
  `[carga] rps=${rps.toFixed(1)} p50=${pct(50)}ms p90=${pct(90)}ms p95=${pct(95)}ms p99=${pct(99)}ms`,
);
if (serverErrors + failures > 0) {
  console.warn(
    `[carga] ATENÇÃO: houve ${serverErrors + failures} respostas com erro — investigue os logs do servidor.`,
  );
  process.exit(2);
}
