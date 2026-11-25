import axios from 'axios';
import Router from 'next/router';
import { useEffect } from 'react';

export function useRedirectIfSignedIn() {
  useEffect(() => {
    let active = true;

    axios
      .get('/api/@me')
      .then(() => {
        if (active) Router.push('/');
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);
}
