exports.wait = delay =>
  new Promise(resolve => {
    setTimeout(resolve, delay)
  });

