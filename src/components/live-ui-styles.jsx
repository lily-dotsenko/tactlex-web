export function LiveUiStyles() {
  return (
    <style>{`
      .live-skeleton {
        min-height: 290px;
        background: linear-gradient(100deg, var(--surface) 30%, var(--surface-alt) 50%, var(--surface) 70%);
        background-size: 220% 100%;
        animation: live-shimmer 1.5s ease-in-out infinite;
      }
      @keyframes live-shimmer { to { background-position-x: -220%; } }
      .live-detail-loading {
        display: grid;
        min-height: 160px;
        place-items: center;
        padding: 28px;
        color: var(--muted);
        font-weight: 750;
        text-align: center;
      }
      .catalog-facts {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 24px;
        padding: 18px 20px;
      }
      .catalog-facts span {
        display: inline-flex;
        min-height: 36px;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-weight: 700;
      }
      .catalog-facts svg { color: var(--blue); }
      .server-empty-strip {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 20px;
        background: var(--surface-alt);
        box-shadow: none;
      }
      .server-empty-strip svg { color: var(--olive); flex: 0 0 auto; }
      .server-empty-strip p { margin: 0; }
      .category-progress-copy small {
        display: block;
        margin-top: 6px;
        color: var(--subtle);
      }
      .session-state-page {
        display: grid;
        align-content: center;
      }
      .session-state-page > * { width: min(100%, 680px); margin-inline: auto; }
      .session-typed-answer { margin-top: 8px; }
      .server-authority-note {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 18px 0 0;
        color: var(--subtle);
        font-size: 0.78rem;
      }
      .server-authority-note svg { color: var(--olive); flex: 0 0 auto; }
      .result-awards { width: 100%; padding: 22px; text-align: left; }
      .result-awards h2 { margin-bottom: 12px; }
      .result-awards ul { list-style: none; margin: 0; padding: 0; }
      .result-awards li {
        display: flex;
        min-height: 46px;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-top: 1px solid var(--border);
      }
      .result-awards li strong { color: var(--olive); }
      .review-live-card {
        display: grid;
        max-width: 820px;
        margin-inline: auto;
        gap: 24px;
        padding: clamp(20px, 5vw, 36px);
      }
      .review-live-head { display: grid; gap: 12px; }
      .review-live-head > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        color: var(--subtle);
        font-size: 0.8rem;
      }
      .review-live-prompt {
        display: grid;
        justify-items: center;
        gap: 8px;
        border-block: 1px solid var(--border);
        padding: 28px 10px;
        text-align: center;
      }
      .review-live-prompt p { margin: 0; font-size: 0.78rem; text-transform: uppercase; }
      .review-live-prompt h2 { margin: 0; font-size: clamp(1.8rem, 5vw, 2.7rem); }
      .review-live-prompt > span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--subtle);
        font-size: 0.76rem;
      }
      .review-rating-fieldset { margin: 0; padding: 0; border: 0; }
      .review-rating-fieldset legend { margin-bottom: 10px; font-size: 0.86rem; font-weight: 750; }
      .rating-control { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .rating-control label { position: relative; cursor: pointer; }
      .rating-control input { position: absolute; opacity: 0; pointer-events: none; }
      .rating-control span {
        display: grid;
        min-height: 48px;
        place-items: center;
        border: 1px solid var(--border-strong);
        border-radius: 9px;
        background: var(--surface);
        font-weight: 750;
      }
      .rating-control input:checked + span {
        border-color: var(--blue);
        background: var(--blue-soft);
        color: var(--blue);
        box-shadow: inset 0 0 0 1px var(--blue);
      }
      .rating-control input:focus-visible + span { outline: 2px solid var(--focus); outline-offset: 3px; }
      .review-live-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
      .review-live-actions p {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        color: var(--subtle);
        font-size: 0.78rem;
      }
      .review-live-actions p svg { color: var(--olive); flex: 0 0 auto; }
      @media (max-width: 600px) {
        .public-header .public-actions .utility-button:not(.utility-icon-only) {
          display: inline-flex;
        }
        .rating-control { grid-template-columns: repeat(2, 1fr); }
        .review-live-actions { align-items: stretch; flex-direction: column; }
        .review-live-actions .button { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .live-skeleton { animation: none; }
      }
    `}</style>
  );
}
