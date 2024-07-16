import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  //get the header
  //verify the header
  // if the header is correct, we need to call next
  // if not, we require user 403

  const header = c.req.header("authorization") || "";
  //now you have to know whether you are getting just token or bearer token
  //and according to that you have to split the token
  //?not using thia splitter for now
  const token = header.split("")[1];

  // const response = await verify(token, c.env.JWT_SECRET);
  // if (response.id) {
  //   next();
  // } else {
  //   c.status(403);
  //   return c.json({ error: "unauthorized" });
  // }
  const user = await verify(header, c.env.JWT_SECRET);
  if (user) {
    //@ts-ignore
    c.set("userId", user.id);
    await next();
  } else {
    c.status(403);
    return c.json({
      message: "You are not logged in",
    });
  }
});

// cstand for context which means it has req, res and next in it

blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const authorAd = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: authorAd,
    },
  });
  return c.json({
    id: blog.id,
  });
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  // const { success } = updateBlogInput.safeParse(body);
  // if (!success) {
  //     c.status(411);
  //     return c.json({
  //         message: "Inputs not correct"
  //     })
  // }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    id: blog.id,
  });
});

// add pagination lol
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blogs = await prisma.post.findMany();

  return c.json({
    blogs,
  });
});
blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.post.findFirst({
      where: {
        id: Number(id),
      },
      select: {
        id: true,
        title: true,
        content: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    return c.json({
      blog,
    });
  } catch (e) {
    c.status(411); // 4
    return c.json({
      message: "Error while fetching blog post",
    });
  }
});
