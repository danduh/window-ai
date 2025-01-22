export const isChromeCanary = () => {
  const userAgent = navigator.userAgent;
  // Assuming Canary is always a higher version than stable and beta
  // Adjust version check according to latest stable Chrome version
  // @ts-ignore
  return userAgent.includes("Chrome") && parseInt(userAgent.match(/Chrome\/(\d+)/)[1], 10) > 132;
};

