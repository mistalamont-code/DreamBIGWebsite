(function() {
  'use strict';

  var DEFAULT_WORKER_URL = '/api/assistant';
  var workerUrl = window.DREAMBIG_ASSISTANT_WORKER_URL || DEFAULT_WORKER_URL;
  var maxInputLength = 700;
  var maxHistory = 10;
  var conversation = [];
  var refs = {};

  function pageKind() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('companion') !== -1) return 'companion';
    if (path.indexOf('first-money-moves') !== -1) return 'first-money-moves';
    if (path.indexOf('visualizer') !== -1) return 'visualizer';
    if (path.indexOf('calculators') !== -1) return 'calculators';
    if (path.indexOf('glossary') !== -1) return 'glossary';
    return 'site';
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function cleanAssistantText(text) {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/^\s{0,3}#{1,6}[ \t]+/gm, '')
      .replace(/^\s{0,3}(?:[-+*]|>)[ \t]+/gm, '')
      .replace(/^\s{0,3}\d+[.)][ \t]+/gm, '')
      .replace(/^\s*```(?:[a-z0-9_-]+)?\s*$/gim, '')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g, '$1$2')
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g, '$1$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function addMessage(role, text) {
    var message = createEl('div', 'ai-assistant-message ' + role);
    var displayText = role === 'assistant' ? cleanAssistantText(text) : text;
    message.textContent = displayText;
    refs.messages.appendChild(message);
    refs.messages.scrollTop = refs.messages.scrollHeight;
    return displayText;
  }

  function setStatus(text) {
    refs.status.textContent = text || '';
  }

  function setBusy(isBusy) {
    refs.send.disabled = isBusy;
    refs.input.disabled = isBusy;
    refs.suggestions.querySelectorAll('button').forEach(function(button) {
      button.disabled = isBusy;
    });
  }

  function openPanel() {
    refs.panel.hidden = false;
    refs.toggle.setAttribute('aria-expanded', 'true');
    refs.input.focus();
  }

  function closePanel() {
    refs.panel.hidden = true;
    refs.toggle.setAttribute('aria-expanded', 'false');
    refs.toggle.focus();
  }

  function togglePanel() {
    if (refs.panel.hidden) openPanel();
    else closePanel();
  }

  function suggestionsForPage() {
    var kind = pageKind();
    if (kind === 'companion') {
      return [
        'Which chapter fits my decision?',
        'Help me choose one next step',
        'How should I use this reflection?'
      ];
    }
    if (kind === 'first-money-moves') {
      return [
        'How do I read my paycheck?',
        'How much emergency savings do I need?',
        'How does student loan interest work?'
      ];
    }
    if (kind === 'visualizer') {
      return [
        'Why does starting early matter?',
        'How does credit change loan costs?',
        'Why are minimum payments expensive?'
      ];
    }
    if (kind === 'glossary') {
      return [
        'Explain APR in plain English',
        'What is compound interest?',
        'How do I start building credit?'
      ];
    }
    if (kind === 'calculators') {
      return [
        'How do I read these calculator results?',
        'How can I lower interest?',
        'What does credit utilization mean?'
      ];
    }
    return [
      'What is the DREAM/BIG framework?',
      'Help me turn a chapter into one next step',
      'How do I start building credit?'
    ];
  }

  function buildWidget() {
    refs.toggle = createEl('button', 'ai-assistant-toggle');
    refs.toggle.type = 'button';
    refs.toggle.setAttribute('aria-expanded', 'false');
    refs.toggle.setAttribute('aria-controls', 'ai-assistant-panel');
    refs.toggle.setAttribute('aria-label', 'Ask the DREAM/BIG Coach');

    var mark = createEl('span', 'ai-assistant-toggle-mark', '?');
    mark.setAttribute('aria-hidden', 'true');
    refs.toggle.appendChild(mark);
    refs.toggle.appendChild(createEl('span', 'ai-assistant-toggle-label', 'Ask Coach'));

    refs.panel = createEl('section', 'ai-assistant-panel');
    refs.panel.id = 'ai-assistant-panel';
    refs.panel.hidden = true;
    refs.panel.setAttribute('role', 'dialog');
    refs.panel.setAttribute('aria-modal', 'false');
    refs.panel.setAttribute('aria-labelledby', 'ai-assistant-title');

    var header = createEl('div', 'ai-assistant-header');
    var headingWrap = createEl('div');
    var title = createEl('h2', 'ai-assistant-title', 'DREAM/BIG Coach');
    title.id = 'ai-assistant-title';
    var subtitle = createEl('div', 'ai-assistant-subtitle', 'Educational help only. Do not share private account info.');
    headingWrap.appendChild(title);
    headingWrap.appendChild(subtitle);

    refs.close = createEl('button', 'ai-assistant-close', 'x');
    refs.close.type = 'button';
    refs.close.setAttribute('aria-label', 'Close coach');

    header.appendChild(headingWrap);
    header.appendChild(refs.close);

    refs.messages = createEl('div', 'ai-assistant-messages');
    refs.messages.setAttribute('role', 'log');
    refs.messages.setAttribute('aria-live', 'polite');
    refs.messages.setAttribute('aria-relevant', 'additions');

    refs.suggestions = createEl('div', 'ai-assistant-suggestions');
    suggestionsForPage().forEach(function(label) {
      var button = createEl('button', 'ai-assistant-suggestion', label);
      button.type = 'button';
      button.addEventListener('click', function() {
        refs.input.value = label;
        sendCurrentInput();
      });
      refs.suggestions.appendChild(button);
    });

    refs.form = createEl('form', 'ai-assistant-form');
    refs.input = createEl('textarea', 'ai-assistant-input');
    refs.input.name = 'assistant-question';
    refs.input.rows = 2;
    refs.input.maxLength = maxInputLength;
    refs.input.placeholder = 'Ask about a chapter or decision...';
    refs.input.setAttribute('aria-label', 'Ask the DREAM/BIG Coach');

    refs.send = createEl('button', 'ai-assistant-send', 'Send');
    refs.send.type = 'submit';

    refs.form.appendChild(refs.input);
    refs.form.appendChild(refs.send);

    refs.status = createEl('div', 'ai-assistant-status');
    refs.status.setAttribute('aria-live', 'polite');

    refs.panel.appendChild(header);
    refs.panel.appendChild(refs.messages);
    refs.panel.appendChild(refs.suggestions);
    refs.panel.appendChild(refs.form);
    refs.panel.appendChild(refs.status);

    document.body.appendChild(refs.toggle);
    document.body.appendChild(refs.panel);

    addMessage('assistant', 'Tell me which chapter or decision you are working through. I can help you understand it and choose one practical next step.');
  }

  function sendCurrentInput() {
    var text = refs.input.value.trim();
    if (!text) return;
    if (text.length > maxInputLength) {
      text = text.slice(0, maxInputLength);
    }

    refs.input.value = '';
    addMessage('user', text);
    conversation.push({ role: 'user', content: text });
    conversation = conversation.slice(-maxHistory);
    requestReply();
  }

  function requestReply() {
    setBusy(true);
    setStatus('Thinking...');
    var conversationBeforeRequest = conversation.slice(0, -1);

    var controller = new AbortController();
    var timeout = window.setTimeout(function() {
      controller.abort();
    }, 25000);

    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversation,
        context: {
          page: pageKind(),
          path: window.location.pathname
        }
      }),
      signal: controller.signal
    })
      .then(function(response) {
        if (!response.ok) {
          return response.json()
            .catch(function() {
              return {};
            })
            .then(function(data) {
              var message = messageForStatus(response.status, data && data.error);
              throw new Error(message);
            });
        }
        return response.json();
      })
      .then(function(data) {
        var reply = typeof data.reply === 'string' ? data.reply.trim() : '';
        if (!reply) throw new Error('The coach did not send a reply. Try asking again in a moment.');
        reply = addMessage('assistant', reply);
        conversation.push({ role: 'assistant', content: reply });
        conversation = conversation.slice(-maxHistory);
        setStatus('');
      })
      .catch(function(error) {
        conversation = conversationBeforeRequest;
        addMessage('assistant', error && error.message ? error.message : 'I could not reach the coach right now. Try again in a minute.');
        setStatus('');
      })
      .finally(function() {
        window.clearTimeout(timeout);
        setBusy(false);
        if (!refs.panel.hidden) refs.input.focus();
      });
  }

  function messageForStatus(status, serverMessage) {
    if (status === 429) {
      return 'The coach is getting a lot of questions right now. Try again in a minute.';
    }
    if (status === 403) {
      return 'This page is not allowed to use the coach. Refresh the official site and try again.';
    }
    if (status === 503) {
      return 'The coach is still being set up. Try again later.';
    }
    if (status === 504) {
      return 'The coach took too long to respond. Try again in a minute.';
    }
    if (status >= 500) {
      return 'The coach service hit a temporary issue. Try again in a minute.';
    }
    return serverMessage || 'I could not reach the coach right now. Try again in a minute.';
  }

  function bindEvents() {
    refs.toggle.addEventListener('click', togglePanel);
    refs.close.addEventListener('click', closePanel);
    refs.form.addEventListener('submit', function(event) {
      event.preventDefault();
      sendCurrentInput();
    });
    refs.input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCurrentInput();
      }
      if (event.key === 'Escape') {
        closePanel();
      }
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && !refs.panel.hidden) {
        closePanel();
      }
    });
  }

  function init() {
    if (!document.body) return;
    buildWidget();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
