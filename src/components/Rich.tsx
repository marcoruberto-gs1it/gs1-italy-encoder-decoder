/** Testo tradotto con le parti tra **asterischi** in evidenza (grassetto), senza HTML nelle traduzioni. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-bold text-current">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}
