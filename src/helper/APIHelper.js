class APIHelper {
    constructor (query , queryStr){
        this.query = query;
        this.queryStr = queryStr;
    }

    search(){
        const search = this.queryStr.search ? {
            name : {
                $regex : this.queryStr.search,
                $options : "i"
            }
        }  : {}

        this.query = this.query.find({...search})
        return this;
    }

    filter(){
        const queryCopy = {...this.queryStr};
        const removeFields = ['search' , 'page' , 'limit']
        removeFields.forEach((field)=> delete queryCopy[field])
        this.query = this.query.find(queryCopy)
        return this
    }

    pagination(resultPerPage){
        const currentPage = Number(this.queryStr.page) ||1
        const skip = resultPerPage * (currentPage - 1)
        this.query = this.query.limit(resultPerPage).skip(skip)
        return this;
    }

}

module.exports = APIHelper;