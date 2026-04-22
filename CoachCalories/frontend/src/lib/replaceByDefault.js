export const NOT_FOUND_IMAGE = "http://localhost:3000/not-found-movie.webp"

const replaceByDefault = (event) => {
  event.target.src = NOT_FOUND_IMAGE
}

export default replaceByDefault
