export const builderApiHandler = (apiKey: string) => {
  return () => {
    return {
      status: 200,
      body: {
        apiKey,
      },
    };
  };
};
