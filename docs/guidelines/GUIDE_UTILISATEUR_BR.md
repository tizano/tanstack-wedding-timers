# Guia do Usuário - Aplicativo Wedding Timers

## 📖 Introdução

Este aplicativo permite gerenciar e exibir cronômetros (timers) para o seu evento de casamento. Ele é composto de duas partes:

- **O aplicativo principal**: Para exibir os timers aos convidados
- **O painel de controle**: Para gerenciar e controlar os timers

---

## 🔐 1. Login

### Como fazer login?

1. Abra o aplicativo no seu navegador [`https://ts-electric-timers.vercel.app/login`](https://ts-electric-timers.vercel.app/login)
2. Você chegará na página de login com o título "Neka & Tony - Wedding timers"
3. Digite seu **e-mail** e sua **senha**
4. Clique no botão **"Login"**

Uma vez conectado, você será automaticamente redirecionado para o painel de controle.

> **Nota**: Se você ver "Logging in..." após clicar, o aplicativo está fazendo seu login.

---

## 🎯 2. O Painel de Controle (Dashboard)

O painel de controle é a interface de controle onde você pode gerenciar todos os timers.

### O que você pode ver?

Você verá uma grade de cartões, cada cartão representa um timer com:

- **O nome do timer** (ex: "Cerimônia", "Coquetel", "Jantar")
- **Um badge de status**:
  - 🟡 PENDING (Pendente): O timer ainda não começou
  - 🔵 RUNNING (Em andamento): O timer está atualmente ativo
  - 🟢 COMPLETED (Concluído): O timer está finalizado
- **A data e hora de início programada**
- **Uma contagem regressiva** mostrando o tempo restante antes de acionar uma ação
- **A lista de ações** associadas ao timer (imagens, sons, vídeos, etc.)
- **Botões de controle** para gerenciar o timer

### Tipos de timers

Existem 3 tipos de timers:

1. **Timers com duração**: Têm uma duração definida (ex: 60 minutos antes da entrada dos noivos)
2. **Timers pontuais**: Disparam em um momento específico sem duração (ex: anúncio especial)
3. **Timers manuais**: Iniciados manualmente por você, sem horário programado

### Como iniciar/exibir um timer?

1. Os timers são exibidos automaticamente após a conclusão
2. Se você ainda quiser exibir um timer, clique em "Display Timer"
3. O timer é exibido imediatamente e seu status muda para "RUNNING"
4. Os convidados agora veem este timer no aplicativo principal

> **Importante**: Quando um timer termina automaticamente, o próximo timer é exibido automaticamente!

---

## 🎬 3. As Ações

Cada timer pode conter várias **ações** que serão acionadas manualmente durante o timer.

### Tipos de ações

- **Imagem**: Exibe uma imagem aos convidados
- **Imagem com som**: Exibe uma imagem e toca um som
- **Vídeo**: Reproduz um vídeo

### Quando as ações são acionadas?

- As ações devem ser acionadas manualmente quando o timer atinge **00:00:00**
- Os cartões começarão a piscar quando a duração do timer atingir seu limite de tempo
- Várias cores de piscada para anunciar visualmente à pessoa responsável para clicar na primeira ação
- Uma ação pode ser acionada a qualquer momento; em alguns casos, haverá ações que piscarão **10 minutos antes do fim**, então você precisará pressionar "Start Action" nesse momento

---

## 🎭 4. Modo Demo

O modo demo permite **testar o aplicativo** sem afetar seu evento real. Você verá banners "Demo" aparecerem por todo o painel de controle.

### Como desativar o modo demo?

No painel de controle, clique no botão **"Disable Demo Mode"** no banner amarelo.

> **Importante**: Não use durante o evento, caso contrário, notifique um administrador, se necessário.

---

## 📺 5. O Aplicativo Principal (Visão dos Convidados)

É isso que seus convidados veem! Ele exibe o timer atual em tela grande.

### O que é exibido

- **Uma grande contagem regressiva** mostrando o tempo restante
- Os textos em diferentes idiomas da primeira ação do timer sendo exibido
- **As ações visuais** que são acionadas automaticamente quando um administrador clica em "Start Action" no painel de controle:
  - Imagens em tela cheia
  - Vídeos
  - Galerias de fotos
  - Textos em vários idiomas
- Um timer menor se a ação atual sobrepor um timer que ainda não terminou

### Atualizações em tempo real

A exibição é atualizada automaticamente graças à tecnologia **Pusher**:

- Quando você exibe um timer no dashboard
- Quando uma ação é acionada
- Quando uma ação é concluída
- Quando um timer termina
- Não é necessário atualizar a página!

---

## ⏱️ 6. O que acontece no final de um timer?

### Conclusão automática

Quando um timer atinge seu tempo alocado:

1. **Verificação de ações**: O aplicativo verifica se todas as ações estão concluídas
2. **Conclusão automática**: Se todas as ações estiverem concluídas, o timer muda automaticamente para "COMPLETED"
3. **Início do próximo**: O próximo timer que não é manual nem pontual inicia **automaticamente** na ordem
4. **Atualização da exibição**: O aplicativo principal exibe o novo timer
5. **Notificação**: O dashboard é atualizado para mostrar a mudança

---

## ❓ 8. Perguntas Frequentes

### O que fazer se um timer/ação não for exibido?

- Verifique se o timer anterior está concluído
- Verifique se a hora de início programada já passou

### É possível voltar atrás?

Não, uma vez que um timer está concluído, ele não pode ser reiniciado. É por isso que o **modo demo** existe!

> **Importante**: Não atualize a página, caso contrário, apenas clique no botão
> Click me to enable video sound

Possibilidade de cancelar a ação atual se houver problema de som duplicado e depois reiniciar
