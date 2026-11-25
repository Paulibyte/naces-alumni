// Renders plain text safely: blank line = new paragraph, single line break kept, links clickable.
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function linkify(line, key) {
  const parts = line.split(URL_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={`${key}-${i}`} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    )
  );
}

export default function PostBody({ text }) {
  const paras = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className="post-body">
      {paras.map((p, i) => (
        <p key={i}>
          {p.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {linkify(line, `${i}-${j}`)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
