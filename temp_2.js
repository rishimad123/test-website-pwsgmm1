if (window.location.protocol === 'file:') {
        var page = window.location.pathname.split('/').pop();
        var hash = window.location.hash || '';
        window.location.replace('/' + page + hash);
      }