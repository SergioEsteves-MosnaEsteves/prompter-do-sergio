## Objetivo

Um app web mobile-first que abre a câmera do celular, mostra o texto do teleprompter rolando por cima da imagem e grava o vídeo, que é baixado direto no aparelho. Sem contas, sem nuvem.

## Telas

**1. Preparação (página inicial `/`)**
- Campo grande para colar o texto do roteiro.
- Ajustes iniciais: velocidade, tamanho da fonte, opacidade e altura da faixa (com valores padrão bons).
- Escolha da câmera (frontal/traseira).
- Botão "Iniciar gravação".

**2. Modo gravação (tela cheia)**
- Vídeo da câmera ao vivo ocupando a tela.
- Faixa de teleprompter sobreposta, com texto rolando suavemente e uma linha de leitura marcada.
- Barra de controles compacta: gravar/parar, play/pause da rolagem, reiniciar do começo, velocidade (−/+), tamanho da fonte (−/+), opacidade e altura da faixa.
- Cronômetro de gravação e indicador vermelho.
- Toque na área do vídeo esconde/mostra os controles para não poluir a filmagem.

**3. Pós-gravação**
- Prévia do vídeo gravado, botão "Baixar", "Regravar" e "Voltar ao roteiro".

## Comportamento

- Rolagem controlada por tempo real (requestAnimationFrame), não por CSS, para velocidade estável.
- Áudio do microfone incluído na gravação.
- Tela mantida acesa durante a gravação quando o navegador suportar.
- Mensagens claras quando a permissão de câmera/microfone for negada ou o navegador não suportar gravação.

## Detalhes técnicos

- `getUserMedia` + `MediaRecorder` no cliente; formato preferido WebM/VP9 com fallback para MP4 quando o navegador (iOS Safari) só oferecer isso.
- Estado do roteiro e ajustes mantidos em memória na rota; nada persistido.
- Rota única `/` com os três estágios (preparo / gravando / prévia) controlados por estado, mais componentes separados: `TeleprompterOverlay`, `CameraPreview`, `RecorderControls`.
- Tudo client-side, sem backend nem Lovable Cloud.
- Design mobile-first, tema escuro de alto contraste com tokens no design system.

## Limitação conhecida

O teleprompter é sobreposto na tela, mas **não** fica gravado dentro do vídeo — o arquivo final contém só a imagem da câmera, que é o comportamento desejado para um teleprompter.
