const Sauce = require('../models/sauces');
const fs = require('fs'); //file system

exports.getAllSauces = (req, res, next) => {
  Sauce.find().then(
    (sauces) => {
      res.status(200).json(sauces);
    }
  ).catch(
    (error) => {
      res.status(400).json({
        error: error
      });
    }
  );
};

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId; //Nous supprimons le champ_userId de la requête envoyée par le client car nous ne devons pas lui faire confiance (rien ne l’empêcherait de nous passer le userId d’une autre personne). Nous le remplaçons en base de données par le _userId extrait du token par le middleware d’authentification.
  const sauce = new Sauce({
    ...sauceObject,
    likes: 0,
    dislikes: 0,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` //${req.get('host')} : normalement, localhost:3000

  });

  sauce
    .save()
    .then(() => { res.status(201).json({ message: 'Sauce enregistré !' }) })
    .catch(error => { res.status(400).json({ error }) })
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id
  }).then(
    (sauce) => {
      res.status(200).json(sauce);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file ? {
    ...JSON.parse(req.body.sauce),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Sauce modifié!' }))
          .catch(error => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => { res.status(200).json({ message: 'Sauce supprimé !' }) })
            .catch(error => res.status(401).json({ error }));
        });
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    });
};

exports.setLike = (req, res, next) => { //fonction qui ajoute ou retire like/dislike en prenant en compte l'UserID pour empêcher de liker/disliker la même sauce plusieurs fois
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      switch (req.body.like) {
        case 1:
          if (sauce.usersLiked.indexOf(req.body.userId) == -1) { sauce.usersLiked.push(req.body.userId) };
          if (sauce.usersDisliked.indexOf(req.body.userId) > -1) { sauce.usersDisliked.splice(sauce.usersDisliked.indexOf(req.body.userId), 1) };
          break;

        case 0:
          if (sauce.usersLiked.indexOf(req.body.userId) > -1) { sauce.usersLiked.splice(sauce.usersLiked.indexOf(req.body.userId), 1) };
          if (sauce.usersDisliked.indexOf(req.body.userId) > -1) { sauce.usersDisliked.splice(sauce.usersDisliked.indexOf(req.body.userId), 1) };
          break;

        case -1:
          if (sauce.usersLiked.indexOf(req.body.userId) > -1) { sauce.usersLiked.splice(sauce.usersLiked.indexOf(req.body.userId), 1) };
          if (sauce.usersDisliked.indexOf(req.body.userId) == -1) { sauce.usersDisliked.push(req.body.userId) };
          break;
      }
      const sauceObject = {
        usersLiked: sauce.usersLiked,
        usersDisliked: sauce.usersDisliked,
        likes: sauce.usersLiked.length,
        dislikes: sauce.usersDisliked.length
      };
      Sauce.updateOne({ _id: req.params.id }, sauceObject)
        .then(() => res.status(200).json({ message: 'Like ou dislike ajouté!' }))
        .catch(error => res.status(400).json({ error }));
    })
};