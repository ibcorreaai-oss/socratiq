# Roteiro do vídeo de demo (2-3 min) — gravação manual de tela

Sem vídeo gerado por IA (avatar/voz sintética) — gravação de tela real com narração ao
vivo, editada depois se precisar. Devpost costuma pedir um vídeo curto (YouTube/Loom)
linkado na submissão.

## Setup antes de gravar
1. Rodar `npm run dev` local ou usar https://socratiq-tau.vercel.app direto (mais
   impressionante pro júri ver que é produção real, não localhost).
2. Ter uma conta já criada (ou criar ao vivo na gravação — mostra o fluxo completo).
3. Colar a `GROQ_API_KEY` antes de gravar (ver PENDÊNCIAS no relatório final) — sem ela
   a geração cai no heurístico local, que funciona mas é bem menos impressionante pro
   vídeo (a IA gerando perguntas boas ao vivo é o "wow moment").

## Roteiro (fala sugerida, adapte com sua voz)

**0:00–0:15 — Hook**
> "Toda ferramenta de estudo com IA faz a mesma coisa: você pergunta, ela responde. Mas
> ser dito uma resposta não é a mesma coisa que aprender ela. Esse é o Socratiq."

*(Tela: landing page, mostrar o hero e o headline "Don't just answer. Understand.")*

**0:15–0:35 — Criar a quest**
> "Eu colo qualquer conteúdo — minhas anotações, um tópico, ou um PDF de aula — e o
> Socratiq transforma isso numa batalha contra um boss de conhecimento."

*(Tela: /quest/new, escolher "Topic", digitar algo tipo "Fotossíntese" ou colar um
parágrafo de texto, clicar em "Summon boss". Mostrar o loading breve.)*

**0:35–1:15 — A batalha (o coração do produto)**
> "Cada resposta certa racha a armadura de cristal do boss. Mas olha o que acontece
> quando eu erro."

*(Tela: responder 1-2 perguntas certas — mostrar o dano no boss + toast de XP. Depois
ERRAR uma de propósito.)*

> "Em vez de simplesmente mostrar a resposta certa, a Sábia — minha mentora de IA — me
> faz uma pergunta que me guia até EU chegar na resposta sozinho. Método socrático de
> verdade, não só um chatbot dando resposta pronta."

*(Tela: mostrar o chat da Sábia abrindo, digitar uma resposta de raciocínio, mostrar a
Sábia respondendo com outra pergunta guiada. Se quiser, mostrar o botão "Just show me"
também, pra deixar claro que existe saída pra quem trava.)*

**1:15–1:40 — Fim da batalha + progresso**
> "Terminando a quest, eu ganho XP, meu streak conta, e o Socratiq já sabe quais
> conceitos eu domino e quais preciso revisar — com repetição espaçada de verdade, não
> só um contador bonito."

*(Tela: results page com XP/accuracy/mastery map, depois ir pro /dashboard mostrando
"Due for review" e a lista de quests.)*

**1:40–2:00 — Fechamento técnico (pra impressionar quem julga Technical Execution)**
> "Por baixo, cada escrita de XP e progresso passa por uma função de banco de dados que
> revalida tudo no servidor — testei tentando forjar meu próprio XP direto na API, e o
> sistema bloqueia silenciosamente. Isso é Next.js 16, Supabase com Row-Level Security,
> e Groq rodando Llama 3.3 de graça."

*(Tela opcional: mostrar rapidamente o código do RPC no GitHub, ou só deixar só na
fala se não quiser complicar a edição.)*

**2:00–2:10 — Encerramento**
> "Socratiq. Não só responde — ensina. Obrigado!"

*(Tela: voltar pra landing page, mostrar o link ao vivo.)*

## Pós-gravação
- Upload no YouTube (não listado, pra poder linkar) ou Loom.
- Revisar o vídeo antes de postar em qualquer lugar (ver doutrina: revisar vídeo antes
  de enviar).
- Colar o link na submissão do Devpost.
