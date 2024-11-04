export function getMessageStream(): ReadableStream<string> {
  const messages = ["Hello, ", "how ", "are ", "you ", "doing ", "today?"];
  let index = 0;

  return new ReadableStream({
    start(controller) {
      function push() {
        if (index < messages.length) {
          controller.enqueue(messages[index]);
          index++;
          setTimeout(push, 500);
        } else {
          controller.close();
        }
      }
      push();
    },
  });
}
