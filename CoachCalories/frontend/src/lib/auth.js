export const getAuthSession = () => {
  const token = localStorage.getItem("token");
  const authGrade = localStorage.getItem("authGrade");
  const username = localStorage.getItem("username");

  // SE MANCA IL TOKEN, FACCIAMO TABULA RASA AUTOMATICA
  if (!token) {
    localStorage.removeItem("authGrade");
    localStorage.removeItem("username");
    return {
      isLogged: false,
      userGrade: "",
      username: ""
    };
  }

  // Se il token c'è, restituiamo i dati reali della sessione
  return {
    isLogged: true,
    userGrade: authGrade || "",
    username: username || ""
  };
};