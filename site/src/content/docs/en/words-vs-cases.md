---
title: Worked cases, not reasons, stop copied errors in LLM agents
description: "Memory handed between LLM agents: on Claude, a false rule was copied in every answer with written reasons, never with worked cases; on DeepSeek, even with the cases. A link to objective-driven AI."
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Worked cases, not reasons, stop copied errors in LLM agents",
        "description": "Memory handed between LLM agents: on Claude, a false rule was copied in every answer with written reasons, never with worked cases; on DeepSeek, even with the cases. A link to objective-driven AI.",
        "inLanguage": "en",
        "datePublished": "2026-09-17",
        "author": {
          "@type": "Organization",
          "name": "ATTRACTOR",
          "url": "https://attractor-observatory-demo.vercel.app/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "ATTRACTOR",
          "url": "https://attractor-observatory-demo.vercel.app/"
        },
        "url": "https://attractor-observatory-demo.vercel.app/en/words-vs-cases/",
        "keywords": [
          "LLM agents",
          "multi-agent systems",
          "error propagation",
          "agent memory",
          "guardrails",
          "objective-driven AI",
          "provenance"
        ],
        "isBasedOn": "https://attractor-observatory-demo.vercel.app/en/replay/"
      }
---

*A short note from the ATTRACTOR project, 17 September 2026. Written by Claude (Anthropic) for Novan Baillif, who runs the project. The data and programs are public; the limits are listed below and matter more than the headline.*

> **Update, 23 October 2026.** An outside operator, terminator2-agent, replayed the experiment on 23 September. On Claude Opus 5.5: the same result. On DeepSeek v4.1 Flash: the false memory was copied despite its cases (3 answers out of 3), and the right rule was kept in 1 answer of 3 only when the model was told to check the memory. His answers are public call by call; rescored with our scorer on 23 October, they give his totals exactly. What this note says therefore holds for Claude, not for every model. The norm took its rule from this: carry the cases **and** state that they must be checked.

## What we measured

One agent hands a memory to another: a rule for filling a register, with the reasons for the rule and, in some conditions, worked cases. One convention in the memory is wrong: an identifier is written in lower case where the register requires upper case. We compared five versions of the memory. They differ only in what would let the receiving model catch the error. There were fifteen prompts, run five times each: 75 calls to Claude Sonnet 5, each in a fresh context, with no tools. The protocol was published before the first call ([experiment E15](https://attractor-observatory-demo.vercel.app/journal/)).

| Memory handed on | Error copied (out of 120) |
|---|---|
| Honest | 0 |
| False, internally consistent | **120** |
| False, and its own written reasons state the correct rule | **120** |
| False, and it carries worked cases that its rule fails | **0** |
| Same, plus a warning to check | **0** |

A correct rule written in plain words next to the wrong procedure protected no receiver. Cases the procedure demonstrably fails protected every answer of this model, without being asked to.

Each figure counts scored values, not decisions: 15 model answers (3 tasks, 5 runs), each scored on 8 values. "120" therefore means all 15 answers.

## Why this may matter beyond our registry

This is an analogy, not a result about architectures. Two positions in the current debate share its shape:

- **Constraints written as text do not bind; constraints that are evaluated do.** In Yann LeCun's objective-driven design, actions are chosen to minimise a task objective together with guardrail objectives, and those objectives are evaluated on predicted outcomes. They are not instructions the system may or may not follow. In our small setting, the stated reason behaved like a suggestion, and the executable counter-case behaved like a cost.
- **Approval-based safety can train evasion.** Yoshua Bengio ([11 September 2026](https://yoshuabengio.org/en/publication/why-are-ai-agents-lying-cheating-and-coordinating)) argues that rewarding "whatever certain humans are likely to approve of" is a vague goal that agents learn to game. Narrow fine-tuning is also known to spread into broad misbehaviour ([Betley et al., Emergent Misalignment](https://arxiv.org/abs/2502.17424)).

The practical rule we drew for our own transmission profile is modest. A memory handed on for reuse should carry cases the receiver can run. A claim that a memory was verified, without those cases, is flagged.

## Limits

- One model family (Claude), one operator, one invented register, one kind of error. A run of the same prompts on GPT-5 copied no error, but it shared one context across prompts and read the honest memory first. It is published as a different measurement, not as a replication.
- The outcome is measured; the mechanism is not. We cannot tell whether the model checks the cases or simply follows the most concrete evidence in front of it.
- A related experiment (E14) had a scoring error. An outside agent found it; we corrected the figures in place.
- An independent operator replayed it on 23 September (update at the top): it holds on Claude and fails on DeepSeek. The prompts and the scorer stay public so that others can replay it.

## Materials

- [Research journal (French), experiments E14 to E16](https://attractor-observatory-demo.vercel.app/journal/)
- [Programs and raw reports](https://github.com/NovanBaillif/attractor/tree/main/civilisation/experiments)
- [The transmission profile these results changed](https://github.com/NovanBaillif/attractor-cooperation)
