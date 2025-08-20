const blogsRouter = require('express').Router();
const jwt = require('jsonwebtoken');

const middleware = require('../utils/middleware');
const Blog = require('../models/blog');
const User = require('../models/user');


blogsRouter.get('/', async (req, res) => {
    const blogs = await Blog.find({}).populate('user', {username: 1, name: 1, id: 1})
            
    res.json(blogs);
})



blogsRouter.post('/', middleware.userExtractor, async (req, res) => {
    let {title, author, url, likes} = req.body;    

    const user = req.user;
    if(!user){
        return res.status(400).json({error: 'UserId missing or not valid'});
    }    

    if(!(title && url)){
        return res.status(400).json({
            error: 'missing data'
        })
    }
    if(!likes){
        likes = 0;
    }
    
    const blog = new Blog({
        title,
        author,
        url,
        likes,
        user: user.id
    });
    
    const result = await blog.save();
    
    if(!result){        
        return res.status(500).json({error: 'something went wrong'});
    }

    user.blogs = user.blogs.concat(result.id);
    await user.save();

    res.status(201).json(result);
})

blogsRouter.delete('/:id', middleware.userExtractor, async (req, res) => {        

    //check user in db
    const user = req.user;       
    if(!user){
        return res.status(400).json({error: 'UserId missing or not valid'});
    }

    //find requested blog
    const blogToDelete = await Blog.findById(req.params.id);    
    
    //check the ownership of the blog    
    if(user._id.toString() != blogToDelete.user.toString()){ // TODO when do the tests, in blogToDelete user property is undefined
        return res.status(400).json({error: 'You have no permissions to delete this blog'})
    }

    //delete blog
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);    
    if(!deletedBlog.id.toString()){
        return res.status(500).json({error: 'Something went wrong'});
    }

    //delete blog reference from user
    user.blogs = user.blogs.filter(blog => blog.toString() !== deletedBlog.id.toString())
    
    await user.save();

    res.status(204).end();
})

blogsRouter.put('/:id', async (req, res) => {
    const { title, author, url, likes } = req.body;
    if(!(title && author && url)){
        return res.status(400).end();
    }

    const blog = await Blog.findById(req.params.id);
    
    if(!blog){
        return res.status(404).end();
    }
    blog.title = title;
    blog.author = author;
    blog.url = url;
    blog.likes = likes || blog.likes;

    const updatedBlog = await blog.save();
    return res.status(201).json(updatedBlog);
})

module.exports = blogsRouter;