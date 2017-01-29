import markovClientFactory from './markovClientFactory';

let markovClient;

onmessage = event => {
  const { data } = event;
  const { type, reqId } = data;
  switch(type) {
  case 'init':
    markovClient = markovClientFactory(data.lines, data.options);
    markovClient.buildCorpus().then(() => postMessage({
      type: 'init'
    }));
    break;
  case 'generateSentences':
    markovClient.generateSentences(data.count).then(sentences => postMessage({
      type: 'sentences',
      sentences,
      reqId
    }));
    break;
  default:
    console.err("unknown message:", event);
  }
}

postMessage('this message is from the worker');
