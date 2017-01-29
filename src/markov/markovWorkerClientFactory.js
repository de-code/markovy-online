import MarkovWorker from './markov.worker';

const worker = new MarkovWorker();

const defer = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

const markovClientFactory = (lines, options) => {
  let generateSentencesDeferred;

  worker.onmessage = event => {
    const { data } = event;
    switch(data.type) {
    case 'sentences':
      if (generateSentencesDeferred) {
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
    worker.postMessage({
      type: 'generateSentences',
      count
    });
    return generateSentencesDeferred.promise;
  };

  return {
    buildCorpus,
    generateSentences
  };
};

export default markovClientFactory;
