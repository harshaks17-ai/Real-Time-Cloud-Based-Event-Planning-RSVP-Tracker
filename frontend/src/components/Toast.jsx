export default function Toast({ message, onDone }) {
  if (!message) return null;
  setTimeout(onDone, 2600);
  return <div className="toast">{message}</div>;
}
