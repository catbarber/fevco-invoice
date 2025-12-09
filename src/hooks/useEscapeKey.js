const useEscapeKey = (handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', listener);

    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [handler]);
};

export  {useEscapeKey};