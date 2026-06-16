const css = `
.page-stack{display:grid;gap:1rem}
.surface-card,.section-card,.media-card,.content-card{border-radius:.5rem;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.06)}
.section-card,.media-card,.content-card{padding:1rem}
.content-card{border:1px solid #e4e4e7}
.media-card{transition:box-shadow .15s ease,transform .15s ease}
.media-card:hover{box-shadow:0 8px 22px rgba(15,23,42,.1)}
.directory-card{border:1px solid #e4e4e7;border-radius:.5rem}
.directory-actions>form,.directory-actions>a{flex:1 1 9rem}
.eyebrow{color:#ff4d2e;font-size:.75rem;font-weight:700;letter-spacing:.05em;line-height:1rem;text-transform:uppercase}
.page-title{font-size:1.5rem;font-weight:600;letter-spacing:0;line-height:1.25}
.section-title{font-size:1.125rem;font-weight:600;letter-spacing:0;line-height:1.25}
.card-title{font-size:1.25rem;font-weight:600;letter-spacing:0;line-height:1.25}
.body-copy{color:#3f3f46;font-size:.875rem;line-height:1.5rem}
.meta-row{align-items:center;color:#71717a;display:flex;flex-wrap:wrap;font-size:.75rem;gap:.75rem;line-height:1rem}
.btn{align-items:center;border-radius:.5rem;display:inline-flex;font-size:.875rem;font-weight:600;justify-content:center;line-height:1.25rem;min-height:2.75rem;padding:.5rem 1rem;text-align:center;transition:background-color .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease}
.btn:disabled{cursor:not-allowed;opacity:.6}
.btn-primary{background:#ff4d2e;box-shadow:0 1px 2px rgba(248,113,113,.45);color:#fff}
.btn-primary:hover{background:#dc2626}
.btn-secondary{background:#18181b;color:#fff}
.btn-secondary:hover{background:#27272a}
.btn-ghost{background:#fff;border:1px solid #d4d4d8;color:#27272a}
.btn-ghost:hover{background:#ecfeff;border-color:#67e8f9}
.btn-muted{background:#f4f4f5;color:#3f3f46}
.btn-muted:hover{background:#e4e4e7}
.btn-danger{background:#fafafa;color:#71717a}
.btn-danger:hover{background:#fef2f2;color:#b91c1c}
.badge-topic,.badge-format,.badge-status{align-items:center;display:inline-flex;font-size:.75rem;line-height:1rem;width:fit-content}
.badge-topic{background:#ff4d2e;border-radius:.25rem;color:#fff;font-weight:700;letter-spacing:.05em;padding:.25rem .625rem;text-transform:uppercase}
.badge-format{background:#f4f4f5;border-radius:999px;color:#3f3f46;font-weight:600;padding:.25rem .625rem}
.badge-status{background:#d9f99d;border-radius:.25rem;color:#18181b;font-weight:700;letter-spacing:.05em;padding:.25rem .625rem;text-transform:uppercase}
.media-frame,.media-placeholder{aspect-ratio:16/9;border-radius:.5rem;width:100%}
.media-frame{object-fit:cover}
.media-placeholder{align-items:center;background:#f4f4f5;display:flex;justify-content:center;padding:0 1.25rem;text-align:center}
.form-label{color:#3f3f46;display:block;font-size:.875rem;font-weight:500}
.form-field,.form-textarea{background:#fff;border:1px solid #e4e4e7;border-radius:.5rem;color:#18181b;font-size:1rem;margin-top:.25rem;outline:none;padding:.5rem .75rem;width:100%}
.form-field:focus,.form-textarea:focus{border-color:#ff4d2e}
.form-textarea{line-height:1.5rem;resize:vertical}
.form-hint{background:#ecfeff;border:1px solid #a5f3fc;border-radius:.5rem;color:#164e63;font-size:.875rem;line-height:1.5rem;padding:.75rem}
.quiz-shell{background:#fff;border:1px solid #e4e4e7;border-radius:.5rem;box-shadow:0 1px 2px rgba(15,23,42,.06);display:flex;flex-direction:column;height:calc(100svh - 11rem);min-height:540px;overflow:hidden;scroll-margin-top:.75rem}
.quiz-header{background:#fafafa;border-bottom:1px solid #f4f4f5;flex-shrink:0;padding:.75rem}
.quiz-body{display:flex;flex:1;flex-direction:column;gap:.75rem;min-height:0;padding:.75rem}
.quiz-content{flex:1;min-height:0;overflow-y:auto;padding-right:.25rem}
.quiz-footer{align-items:center;border-top:1px solid #f4f4f5;display:flex;flex-shrink:0;gap:.5rem;justify-content:space-between;padding-top:.75rem}
.quiz-back{border:1px solid #e4e4e7;border-radius:.5rem;color:#3f3f46;font-size:.875rem;font-weight:600;padding:.75rem 1rem}
.quiz-next{background:#18181b;border-radius:.5rem;color:#fff;font-size:.875rem;font-weight:600;padding:.75rem 1.25rem}
.quiz-back:disabled{cursor:not-allowed;opacity:.4}
#materials .materials-label-open{display:none}
#materials[open] .materials-label-open{display:inline}
#materials[open] .materials-label-closed{display:none}
@media (min-width:640px){.page-stack{gap:1.25rem}.section-card,.media-card,.content-card{padding:1.25rem}.page-title{font-size:1.875rem}.card-title{font-size:1.5rem}.body-copy{font-size:1rem}}
@media (min-width:640px){.quiz-shell{height:calc(100svh - 7rem);min-height:620px}.quiz-header,.quiz-body{padding:1rem}.quiz-back,.quiz-next{padding-top:.5rem;padding-bottom:.5rem}}
@media (min-width:1280px){.topic-filter-row{display:none!important}}
`;

export function DesignSystemStyles() {
  return <style id="design-system-styles" dangerouslySetInnerHTML={{ __html: css }} />;
}
