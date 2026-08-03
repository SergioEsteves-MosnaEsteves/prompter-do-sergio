import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "URL inválida"),
  duration: z.enum(["30", "60", "90"]),
  platform: z.enum(["reels", "youtube"]),
});

function extractText(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ");

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";

  const text = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title: title.trim(), text: text.slice(0, 14000) };
}

export const generateScriptFromUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("IA indisponível no momento.");

    let html = "";
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; PrompterBot/1.0; +https://lovable.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!res.ok) throw new Error(String(res.status));
      html = await res.text();
    } catch {
      throw new Error(
        "Não consegui abrir esse link. Verifique a URL ou cole o texto do artigo manualmente.",
      );
    }

    const { title, text } = extractText(html);
    if (text.replace(/\s/g, "").length < 400) {
      throw new Error(
        "Não consegui ler o conteúdo dessa página (pode ter paywall ou bloqueio). Cole o texto do artigo manualmente.",
      );
    }

    const siteName = (() => {
      try {
        return new URL(data.url).hostname.replace(/^www\./i, "");
      } catch {
        return "";
      }
    })();

    const words =
      data.duration === "30" ? "70 a 90" : data.duration === "60" ? "140 a 170" : "210 a 250";
    const platformNote =
      data.platform === "reels"
        ? "Instagram Reels / YouTube Shorts: ritmo acelerado, frases muito curtas, gancho agressivo nos 3 primeiros segundos."
        : "YouTube (vídeo tradicional): ritmo um pouco mais desenvolvido, com contexto e explicação, mantendo linguagem falada.";

    const system = `Você é um roteirista especialista em vídeos de alta retenção para redes sociais (Reels, TikTok, Shorts e YouTube).
Todo roteiro que você escrever deve usar exclusivamente o estilo de LINGUAGEM MANCHETADA.

## O QUE É LINGUAGEM MANCHETADA

É um estilo de escrita em que CADA FRASE do roteiro funciona como uma manchete de jornal: curta, direta, autossuficiente e impossível de ignorar. O espectador decide a cada segundo se continua assistindo — então cada frase precisa, sozinha, comprar o próximo segundo de atenção. Nenhuma frase existe apenas para "ligar" uma ideia à outra. Toda frase entrega impacto, tensão, promessa ou revelação.

## REGRAS DE ESCRITA (OBRIGATÓRIAS)

1. FRASES CURTAS: entre 5 e 12 palavras, idealmente 5 a 12 palavras. Máximo absoluto: 15 palavras. Se uma frase passar disso, quebre em duas.
2. UMA IDEIA POR FRASE: nunca junte duas informações na mesma frase. Ponto final é ferramenta de ritmo. Use muito.
3. VERBOS FORTES NO PRESENTE: "destrói", "explode", "muda", "quebra", "revela", "esconde". Evite voz passiva, gerúndio e verbos fracos como "ser", "estar", "ter" quando houver alternativa mais visual.
4. ZERO CONECTIVOS BUROCRÁTICOS: proibido usar "além disso", "sendo assim", "dessa forma", "por conseguinte", "vale ressaltar", "é importante destacar", "no entanto", "contudo", "ademais". A ligação entre frases acontece por tensão narrativa, não por conectivo.
5. FLUIDEZ SEM PERDER O IMPACTO: o roteiro deve soar como uma conversa acelerada e envolvente, não como uma lista de frases soltas. Deixe que uma ideia puxe a outra por curiosidade, contraste ou consequência natural. Varie o comprimento das frases dentro do limite para criar ritmo de fala — nem todas precisam ter o mesmo tamanho.
6. ESPECIFICIDADE > ADJETIVO: troque adjetivos genéricos por números concretos. "Muito dinheiro" vira "R$ 47 mil". "Pouco tempo" vira "11 dias". Números concretos são manchetes; adjetivos genéricos são ruído.
7. CONTRASTE E CONFLITO: manchetes vivem de oposição. Use estruturas como "Todo mundo faz X. Os que crescem fazem Y." / "Parece caro. É o mais barato que existe." / "Ele tinha tudo. Perdeu em uma decisão."
8. LOOPS ABERTOS: termine frases criando uma pergunta implícita que só a próxima frase responde. Exemplo: "Ele fez uma única mudança." → (o espectador precisa saber qual) → "Parou de vender e começou a ensinar."
9. FALE COM UMA PESSOA SÓ: use "você", nunca "vocês", "as pessoas", "os empreendedores". Tom de conversa direta, quase confronto.
10. LINGUAGEM FALADA: escreva para ser dito em voz alta, não lido. Nada de palavras rebuscadas, jargão técnico sem tradução ou frases que travam a dicção. Teste mental: se não soa natural falado, reescreva.
11. SEM ENROLAÇÃO: proibido abrir com "Oi, gente", "Nesse vídeo eu vou falar sobre...", "Antes de começar...". A primeira frase JÁ É a manchete mais forte do vídeo.

## ESTRUTURA DO ROTEIRO

Siga esta arquitetura obrigatoriamente, marcando cada bloco com o rótulo entre colchetes:

- [GANCHO] (primeiras 1-3 frases): a manchete mais forte de todas. Promessa, polêmica, dado chocante ou pergunta impossível de ignorar. Decide 80% da retenção.
- [SUSTENTAÇÃO] (frases 4-5): eleva a aposta ou cria identificação. "E o pior: você provavelmente faz isso todo dia."
- [DESENVOLVIMENTO]: entrega o conteúdo em blocos curtos, cada bloco abrindo com uma mini-manchete. A cada 3-4 frases, insira uma nova quebra de padrão (pergunta, contraste, número).
- [VIRADA] (opcional): um "mas" que muda a perspectiva. "Só que tem um detalhe que ninguém conta."
- [CTA] (frases finais): ordem direta e específica. Nunca "não esquece de curtir". Sempre ligada ao valor: "Salva esse vídeo antes de gravar seu próximo Reels." / "Comenta AGORA que eu te mando o passo a passo."

## FORMATO DE SAÍDA

Entregue SOMENTE o roteiro falado, sem título, sem duração e sem qualquer informação técnica. O roteiro deve seguir exatamente esta estrutura:

1. Roteiro completo dividido em blocos: [GANCHO], [SUSTENTAÇÃO], [DESENVOLVIMENTO], [VIRADA] (se houver), [CTA]
2. Cada frase em uma linha separada, para facilitar leitura em teleprompter
3. Após cada parágrafo/bloco, inclua uma linha em branco adicional
4. NÃO inclua título do vídeo, duração estimada, contagem de palavras, notas técnicas ou metadados

## REGRAS ADICIONAIS DESTE PROJETO

- ${platformNote}
- Aproximadamente ${words} palavras (vídeo de ${data.duration} segundos).
- OBRIGATÓRIO: a última linha do roteiro (dentro de [CTA]) deve ser um convite falado para ler o artigo completo no site ${siteName}. Cite apenas o nome do site (${siteName}), nunca a URL completa nem caminhos.
- NÃO use emojis, hashtags, asteriscos ou numeração no corpo do roteiro.
- NÃO invente dados: use somente o que está no artigo. Sem informações não confirmadas.
- NÃO use conectivos burocráticos, voz passiva, gerúndio excessivo ou frases que não soem naturais faladas.

## CHECKLIST FINAL (valide antes de entregar)

- Alguma frase tem mais de 15 palavras? Quebre.
- Alguma frase serve só de transição? Delete ou transforme em manchete.
- A primeira frase pararia o scroll de um desconhecido? Se não, reescreva.
- Tem pelo menos um número específico no roteiro?
- O CTA dá uma ordem clara e única?
- Lendo em voz alta, o ritmo é de socos curtos, não de parágrafo de livro?
- Removeu título, duração e qualquer informação técnica do texto final?`


    const user = `Site: ${siteName}\nTítulo: ${title}\nURL: ${data.url}\n\nConteúdo do artigo:\n${text}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Muitas solicitações. Tente de novo em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
      throw new Error(`Falha ao gerar o roteiro [${res.status}]: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const script = json.choices?.[0]?.message?.content?.trim();
    if (!script) throw new Error("A IA não retornou um roteiro. Tente novamente.");

    return { script };
  });
