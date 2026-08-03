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

    const system = `Você é roteirista de vídeos curtos em português do Brasil.
Escreva um roteiro para ser LIDO EM VOZ ALTA num teleprompter, com base apenas no artigo fornecido.

Regras:
- ${platformNote}
- Aproximadamente ${words} palavras (vídeo de ${data.duration} segundos).
- Estrutura: gancho de impacto em tom de manchete (1 frase), contexto (1 frase), 3 a 4 pontos-chave, fechamento com CTA curto.
- OBRIGATÓRIO: a última linha do roteiro deve ser um convite falado para ler o artigo completo no site ${siteName}. Cite apenas o nome do site (${siteName}), nunca a URL completa nem caminhos.
- Frases curtas, voz ativa, linguagem falada e direta. Uma ideia por linha.
- Separe as frases por quebras de linha, respeitando a respiração de quem fala.
- NÃO use marcações de cena, colchetes, títulos, emojis, hashtags, asteriscos ou numeração.
- NÃO invente dados: use somente o que está no artigo. Sem informações não confirmadas.
- Devolva apenas o texto do roteiro.`;

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
