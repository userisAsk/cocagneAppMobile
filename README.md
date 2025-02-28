
# Application mobile | Jardin de cocagne

Nous développons une Application mobile complexe en React native et firebase


## Authors

- [@Kyriann](https://github.com/userisAsk/)
- [@Adame](https://github.com/ov3rc0me)



## Deployment

pour lancer le projet la première fois 

```bash
  npm install
```
 
si jamais il y a une erreur  dans tsconfig executer cette commande : npx expo install expo

commande a lancer pour démarrer l'application

```bash
  npx expo start --clear
```

- avoir l'application Expo sur téléphone
- scanner le QR code
- ne marche pas sur le web (map)

se connecter sur l'application Livreur : 
- mail : maxime.lol@gmail.com
- mot de passe : maxime

se connecter sur l'application Client : 
- mail : alex@gmail.com
- mot de passe : alex123
  

## Code a mettre pour faire fonctionner la base de donnée

a mettre dans  dans le Fichier FirebaseConfig.ts

```typescript
  const firebaseConfig = {
  apiKey: "AIzaSyDh3Ez4KgWjFP92LUEWZb35Puk7SSdp8Mg",
  authDomain: "jardincocagne-f37ea.firebaseapp.com",
  projectId: "jardincocagne-f37ea",
  storageBucket: "jardincocagne-f37ea.firebasestorage.app",
  messagingSenderId: "753372043856",
  appId: "1:753372043856:web:7eaf3023e7d1d5ef534f55",
  measurementId: "G-VYV5P5BH4Z"
};
```
 

Qr code signification : 

Qrcode valeur : 1 = panier simple
Qrcode valeur : 2 = panier familial
Qrcode valeur : 28 = depot dans epinal qui correspond
Qrcode valeur : 70 = depot dans epinal qui correspond

