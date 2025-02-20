/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: 
        { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | 
        { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | 
        { pathname: `/../FirebaseConfig`; params?: Router.UnknownInputParams; } | 
        { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(auth)'}/login` | `${'/(auth)'}/clientLogin` | `${'/(auth)'}/livreurLogin` | `${'/(auth)'}/chooseRole` | `/login`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/panierRecap` | `/panierRecap`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/deliveryDepot` | `/deliveryDepot`; params?: Router.UnknownInputParams; } |
        { pathname: `${'/(tabs)'}/scanValidation`; params?: Router.UnknownInputParams; } | // Ajout ici
        { pathname: `/+not-found`, params: Router.UnknownInputParams & { } };
      
      hrefOutputParams: 
        { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | 
        { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | 
        { pathname: `/../FirebaseConfig`; params?: Router.UnknownOutputParams; } | 
        { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(auth)'}/login` | `${'/(auth)'}/clientLogin` | `${'/(auth)'}/livreurLogin` | `${'/(auth)'}/chooseRole` | `/login`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(tabs)'}/panierRecap` | `/panierRecap`; params?: Router.UnknownOutputParams; } | 
        { pathname: `${'/(tabs)'}/deliveryDepot` | `/deliveryDepot`; params?: Router.UnknownOutputParams; } |
        { pathname: `${'/(tabs)'}/scanValidation`; params?: Router.UnknownOutputParams; } | // Ajout ici
        { pathname: `/+not-found`, params: Router.UnknownOutputParams & { } };
      
      href: 
        Router.RelativePathString | Router.ExternalPathString | 
        `/../FirebaseConfig${`?${string}` | `#${string}` | ''}` | 
        `/_sitemap${`?${string}` | `#${string}` | ''}` | 
        `${'/(auth)'}/login${`?${string}` | `#${string}` | ''}` | 
        `${'/(auth)'}/clientLogin${`?${string}` | `#${string}` | ''}` | 
        `${'/(auth)'}/livreurLogin${`?${string}` | `#${string}` | ''}` | 
        `${'/(auth)'}/chooseRole${`?${string}` | `#${string}` | ''}` | 
        `/login${`?${string}` | `#${string}` | ''}` | 
        `${'/(tabs)'}/home${`?${string}` | `#${string}` | ''}` | 
        `/home${`?${string}` | `#${string}` | ''}` | 
        `${'/(tabs)'}${`?${string}` | `#${string}` | ''}` | 
        `/${`?${string}` | `#${string}` | ''}` | 
        `${'/(tabs)'}/profile${`?${string}` | `#${string}` | ''}` | 
        `/profile${`?${string}` | `#${string}` | ''}` | 
        `${'/(tabs)'}/panierRecap${`?${string}` | `#${string}` | ''}` | 
        `/panierRecap${`?${string}` | `#${string}` | ''}` | 
        `${'/(tabs)'}/deliveryDepot${`?${string}` | `#${string}` | ''}` | 
        `/deliveryDepot${`?${string}` | `#${string}` | ''}` |
        `${'/(tabs)'}/scanValidation${`?${string}` | `#${string}` | ''}` | // Ajout ici
        { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | 
        { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | 
        { pathname: `/../FirebaseConfig`; params?: Router.UnknownInputParams; } | 
        { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(auth)'}/login` | `${'/(auth)'}/clientLogin` | `${'/(auth)'}/livreurLogin` | `${'/(auth)'}/chooseRole` | `/login`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/panierRecap` | `/panierRecap`; params?: Router.UnknownInputParams; } | 
        { pathname: `${'/(tabs)'}/deliveryDepot` | `/deliveryDepot`; params?: Router.UnknownInputParams; } |
        { pathname: `${'/(tabs)'}/scanValidation`; params?: Router.UnknownInputParams; } | // Ajout ici
        `/+not-found` | 
        { pathname: `/+not-found`, params: Router.UnknownInputParams & { } };
    }
  }
}