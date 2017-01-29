import MarkovWorker from './markov.worker';

const defer = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

let previousWorker;

const markovClientFactory = (lines, options) => {
  let generateSentencesDeferred;
  let generateSentencesId = 1;

  if (previousWorker) {
    previousWorker.terminate();
  }

  const worker = new MarkovWorker();
  previousWorker = worker;

  worker.onmessage = event => {
    const { data } = event;
    switch(data.type) {
    case 'sentences':
      if (generateSentencesDeferred && generateSentencesId === data.reqId) {
        generateSentencesDeferred.resolve(data.sentences);
        generateSentencesDeferred = null;
      }
      break;
    }
  };

  worker.postMessage({
    type: 'init',
    lines,
    options
  });

  const buildCorpus = () => Promise.resolve();

  const generateSentences = count => {
    generateSentencesDeferred = defer();
    generateSentencesId++;
    worker.postMessage({
      type: 'generateSentences',
      count,
      reqId: generateSentencesId
    });
    return generateSentencesDeferred.promise;
  };

  return {
    buildCorpus,
    generateSentences
  };
};

export default markovClientFactory;
